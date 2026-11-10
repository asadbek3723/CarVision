import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { cancellableUntil, fetchBookingItems, fetchBookingRows, pushBookingEvent, reviewBooking } from '@/server/bookings';
import { syncDecisionToTelegram } from '@/server/telegram';

const unauthorized = () => NextResponse.json({ success: false, code: 'ADMIN_SESSION_REQUIRED', error: 'Unauthorized' }, { status: 401 });

/**
 * Payments queue: receipts to check, workshop payouts to transfer and customer refunds to send.
 * Only the admin sees the commission / payout / refund split.
 */
export async function GET(request: NextRequest) {
  try {
    if ('response' in (await adminLiveOr401(request))) return unauthorized();
    const db = createAdminClient();
    const rows = (await fetchBookingRows(db, { statuses: ['PENDING_ADMIN_APPROVAL', 'UNLOCKED', 'REDEEMED', 'REJECTED', 'CANCELLED'], limit: 300 }))
      // Unpaid orders the customer closed are noise for the admin
      .filter((r) => r.status !== 'CANCELLED' || r.unlocked_at !== null);
    const items = await fetchBookingItems(db, rows.map((r) => r.id));
    const { data: shops } = await db.from('shops').select('id, shop_name, phone').in('id', [...new Set(rows.map((r) => r.shop_id))]);
    const shopById = new Map((shops ?? []).map((s) => [s.id as string, s]));

    const orders = await Promise.all(
      rows.map(async (r) => {
        let receiptUrl: string | null = null;
        if (r.receipt_path) {
          const { data } = await db.storage.from('receipts').createSignedUrl(r.receipt_path, 600);
          receiptUrl = data?.signedUrl ?? null;
        }
        const its = items.filter((i) => i.booking_id === r.id);
        const shop = shopById.get(r.shop_id);
        return {
          id: r.id,
          orderNumber: r.booking_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          studioName: (shop?.shop_name as string | undefined) ?? '',
          studioPhone: (shop?.phone as string | undefined) ?? '',
          itemDescription: its.map((i) => `${i.name} ×${i.quantity}`).join(', '),
          totalPriceCents: r.total_cents,
          amountCents: r.amount_cents,
          commissionCents: r.commission_cents,
          payoutCents: r.payout_cents,
          payoutStatus: r.payout_status,
          payoutPaidAt: r.payout_paid_at,
          refundCents: r.refund_cents,
          refundStatus: r.refund_status,
          cancelledAt: r.cancelled_at,
          handedOver: r.status === 'REDEEMED',
          /** While set, the customer may still cancel: better to wait with the payout. */
          cancellableUntil: cancellableUntil(r),
          transactionRef: r.receipt_hash ? r.receipt_hash.slice(0, 12).toUpperCase() : '—',
          status:
            r.status === 'PENDING_ADMIN_APPROVAL'
              ? ('pending' as const)
              : r.status === 'REJECTED'
              ? ('rejected' as const)
              : r.status === 'CANCELLED'
              ? ('cancelled' as const)
              : ('verified' as const),
          submittedAt: r.receipt_submitted_at ?? r.created_at,
          receiptUrl,
        };
      })
    );
    return NextResponse.json({ success: true, orders });
  } catch (err) {
    console.error('admin escrow GET error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}

const reviewSchema = z.union([
  z.object({ orderId: z.string().uuid(), status: z.enum(['verified', 'rejected']), reason: z.string().trim().max(300).optional() }),
  z.object({ orderId: z.string().uuid(), action: z.enum(['payout_paid', 'refund_done']) }),
]);

/**
 * Approve / reject a receipt (approval opens the workshop's address to the customer), or mark
 * a manual bank transfer as done: the workshop payout or the customer refund.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await adminLiveOr401(request);
    if ('response' in auth) return unauthorized();
    const adminId = auth.adminId;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Missing orderId or status' }, { status: 400 });
    const db = createAdminClient();

    if ('action' in parsed.data) {
      const fn = parsed.data.action === 'payout_paid' ? 'admin_mark_payout' : 'admin_mark_refund';
      const { data, error } = await db.rpc(fn, { p_admin_id: adminId, p_booking_id: parsed.data.orderId, p_ip: ip.slice(0, 45) });
      const r = data as { success?: boolean; error?: string } | null;
      if (error || !r) return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
      if (!r.success) {
        return NextResponse.json(
          { success: false, error: r.error === 'NOT_FOUND' ? 'Buyurtma topilmadi' : 'Bu amal allaqachon bajarilgan yoki mumkin emas' },
          { status: r.error === 'NOT_FOUND' ? 404 : 409 }
        );
      }
      await pushBookingEvent(db, parsed.data.orderId, parsed.data.action === 'payout_paid' ? 'payout_paid' : 'refund_done');
      return NextResponse.json({ success: true });
    }

    const approve = parsed.data.status === 'verified';
    const r = await reviewBooking(db, { adminId, bookingId: parsed.data.orderId, approve, reason: parsed.data.reason, ip });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error === 'INVALID_STATE' ? 'Bu buyurtma allaqachon ko‘rib chiqilgan' : 'Buyurtma topilmadi' }, { status: r.error === 'INVALID_STATE' ? 409 : 404 });
    }
    await syncDecisionToTelegram(parsed.data.orderId, approve, parsed.data.reason);
    return NextResponse.json({ success: true, status: r.status });
  } catch (err) {
    console.error('admin escrow PATCH error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
