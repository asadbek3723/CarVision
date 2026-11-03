import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { fetchBookingItems, fetchBookingRows, reviewBooking } from '@/server/bookings';
import { syncDecisionToTelegram } from '@/server/telegram';

const unauthorized = () => NextResponse.json({ success: false, code: 'ADMIN_SESSION_REQUIRED', error: 'Unauthorized' }, { status: 401 });

/** Deposit review queue: bookings whose customer sent a receipt (and the decided ones). */
export async function GET(request: NextRequest) {
  try {
    if ('response' in (await adminLiveOr401(request))) return unauthorized();
    const db = createAdminClient();
    const rows = await fetchBookingRows(db, { statuses: ['PENDING_ADMIN_APPROVAL', 'UNLOCKED', 'REDEEMED', 'REJECTED'], limit: 200 });
    const items = await fetchBookingItems(db, rows.map((r) => r.id));
    const { data: shops } = await db.from('shops').select('id, shop_name').in('id', [...new Set(rows.map((r) => r.shop_id))]);
    const shopName = new Map((shops ?? []).map((s) => [s.id as string, s.shop_name as string]));

    const orders = await Promise.all(
      rows.map(async (r) => {
        let receiptUrl: string | null = null;
        if (r.receipt_path) {
          const { data } = await db.storage.from('receipts').createSignedUrl(r.receipt_path, 600);
          receiptUrl = data?.signedUrl ?? null;
        }
        const its = items.filter((i) => i.booking_id === r.id);
        return {
          id: r.id,
          orderNumber: r.booking_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          studioName: shopName.get(r.shop_id) ?? '',
          itemDescription: its.map((i) => `${i.name} ×${i.quantity}`).join(', '),
          totalPriceCents: r.total_cents,
          depositCents: r.deposit_cents,
          paymentMethod: 'Bank' as const,
          transactionRef: r.receipt_hash ? r.receipt_hash.slice(0, 12).toUpperCase() : '—',
          status: r.status === 'PENDING_ADMIN_APPROVAL' ? ('pending' as const) : r.status === 'REJECTED' ? ('rejected' as const) : ('verified' as const),
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

const reviewSchema = z.object({ orderId: z.string().uuid(), status: z.enum(['verified', 'rejected']), reason: z.string().trim().max(300).optional() });

/** Approve (unlocks the workshop for the customer) or reject the deposit receipt. */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await adminLiveOr401(request);
    if ('response' in auth) return unauthorized();
    const adminId = auth.adminId;

    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Missing orderId or status' }, { status: 400 });

    const approve = parsed.data.status === 'verified';
    const r = await reviewBooking(createAdminClient(), {
      adminId,
      bookingId: parsed.data.orderId,
      approve,
      reason: parsed.data.reason,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error === 'INVALID_STATE' ? 'Bu bron allaqachon ko‘rib chiqilgan' : 'Bron topilmadi' }, { status: r.error === 'INVALID_STATE' ? 409 : 404 });
    }
    await syncDecisionToTelegram(parsed.data.orderId, approve, parsed.data.reason);
    return NextResponse.json({ success: true, status: r.status });
  } catch (err) {
    console.error('admin escrow PATCH error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
