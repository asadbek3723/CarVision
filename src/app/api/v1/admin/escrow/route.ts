import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, ipOf } from '@/server/admin';
import {
  BOOKING_COLUMNS,
  cancellableUntil,
  expireUnpaid,
  fetchBookingItems,
  payoutAllowedFrom,
  pushBookingEvent,
  reviewBooking,
  type BookingRow,
} from '@/server/bookings';
import { syncDecisionToTelegram } from '@/server/telegram';
import { CANCEL_WINDOW_HOURS } from '@/domain/money';

export const dynamic = 'force-dynamic';

const fail = (status: number, code: string, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, code, error, ...extra }, { status });

const QUEUES = ['pending', 'payouts', 'refunds', 'verified', 'rejected', 'all'] as const;
type Queue = (typeof QUEUES)[number];
const PAGE = 30;

type Db = ReturnType<typeof createAdminClient>;

/** Each queue is its own database query, so nothing old ever drops out of a work list. */
function applyQueue<Q extends { eq: Function; in: Function; neq: Function; or: Function }>(q: Q, queue: Queue): Q {
  switch (queue) {
    case 'pending':
      return q.eq('status', 'PENDING_ADMIN_APPROVAL');
    case 'payouts':
      return q.eq('payout_status', 'PENDING').in('status', ['UNLOCKED', 'REDEEMED']);
    case 'refunds':
      return q.eq('refund_status', 'PENDING');
    case 'verified':
      return q.in('status', ['UNLOCKED', 'REDEEMED']);
    case 'rejected':
      return q.eq('status', 'REJECTED');
    default:
      // Everything with money involved; unpaid orders the customer closed are noise.
      return q.neq('status', 'AWAITING_PAYMENT').or('status.neq.CANCELLED,unlocked_at.not.is.null,refund_status.neq.NONE');
  }
}

async function searchFilter(db: Db, raw: string): Promise<string | null> {
  const q = raw.replace(/[%,()*\\]/g, ' ').trim().slice(0, 60);
  if (!q) return null;
  const { data: shops } = await db.from('shops').select('id').ilike('shop_name', `%${q}%`).limit(50);
  const parts = [`booking_number.ilike.%${q}%`, `customer_name.ilike.%${q}%`, `customer_phone.ilike.%${q}%`];
  if (shops?.length) parts.push(`shop_id.in.(${shops.map((s) => s.id as string).join(',')})`);
  return parts.join(',');
}

const counted = async (db: Db, queue: Queue) => {
  const { count } = await applyQueue(db.from('bookings').select('id', { count: 'exact', head: true }), queue);
  return count ?? 0;
};

/**
 * Payments queue: receipts to check, workshop payouts to transfer and customer refunds to send.
 * Only the admin sees the commission / payout / refund split. Receipt images are fetched on demand.
 */
export async function GET(request: NextRequest) {
  try {
    if ('response' in (await adminLiveOr401(request))) return fail(401, 'ADMIN_SESSION_REQUIRED', 'Unauthorized');
    const params = new URL(request.url).searchParams;
    const queue = (QUEUES as readonly string[]).includes(params.get('queue') ?? '') ? (params.get('queue') as Queue) : 'pending';
    const offset = Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
    const db = createAdminClient();
    await expireUnpaid(db);

    let query = applyQueue(db.from('bookings').select(BOOKING_COLUMNS, { count: 'exact' }), queue);
    const search = await searchFilter(db, params.get('q') ?? '');
    if (search) query = query.or(search);
    // Work queues: oldest first (first in, first out). History: newest first.
    const oldestFirst = queue === 'pending' || queue === 'payouts' || queue === 'refunds';
    const { data, count, error } = await query
      .order(queue === 'pending' ? 'receipt_submitted_at' : 'created_at', { ascending: oldestFirst })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as BookingRow[];

    const [items, shopsRes, counts] = await Promise.all([
      fetchBookingItems(db, rows.map((r) => r.id)),
      rows.length ? db.from('shops').select('id, shop_name, phone, payout_details').in('id', [...new Set(rows.map((r) => r.shop_id))]) : Promise.resolve({ data: [] }),
      Promise.all(QUEUES.map(async (q) => [q, await counted(db, q)] as const)),
    ]);
    const shopById = new Map((shopsRes.data ?? []).map((s) => [s.id as string, s]));

    const orders = rows.map((r) => {
      const its = items.filter((i) => i.booking_id === r.id);
      const shop = shopById.get(r.shop_id);
      return {
        id: r.id,
        orderNumber: r.booking_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        shopId: r.shop_id,
        studioName: (shop?.shop_name as string | undefined) ?? '',
        studioPhone: (shop?.phone as string | undefined) ?? '',
        payoutDetails: (shop?.payout_details as string | null | undefined) ?? null,
        itemDescription: its.map((i) => `${i.name} ×${i.quantity}`).join(', '),
        totalPriceCents: r.total_cents,
        amountCents: r.amount_cents,
        amountUzs: r.amount_uzs !== null ? Number(r.amount_uzs) : null,
        fxRate: r.fx_rate !== null ? Number(r.fx_rate) : null,
        paidAmountUzs: r.paid_amount_uzs !== null ? Number(r.paid_amount_uzs) : null,
        bankReference: r.bank_reference,
        commissionCents: r.commission_cents,
        payoutCents: r.payout_cents,
        payoutStatus: r.payout_status,
        payoutPaidAt: r.payout_paid_at,
        refundCents: r.refund_cents,
        refundStatus: r.refund_status,
        cancelledAt: r.cancelled_at,
        handedOver: r.status === 'REDEEMED',
        /** While set, the customer may still cancel. */
        cancellableUntil: cancellableUntil(r),
        /** The database refuses the payout before this moment (null = allowed now). */
        payoutAllowedFrom: r.payout_status === 'PENDING' ? payoutAllowedFrom(r) : null,
        transactionRef: r.receipt_hash ? r.receipt_hash.slice(0, 12).toUpperCase() : '—',
        hasReceipt: Boolean(r.receipt_path),
        rawStatus: r.status,
        status:
          r.status === 'PENDING_ADMIN_APPROVAL'
            ? ('pending' as const)
            : r.status === 'REJECTED'
            ? ('rejected' as const)
            : r.status === 'CANCELLED'
            ? ('cancelled' as const)
            : ('verified' as const),
        submittedAt: r.receipt_submitted_at ?? r.created_at,
      };
    });
    const total = count ?? 0;
    return NextResponse.json({
      success: true,
      orders,
      total,
      nextOffset: offset + rows.length < total ? offset + rows.length : null,
      counts: Object.fromEntries(counts),
    });
  } catch (err) {
    console.error('admin escrow GET error:', err);
    return fail(500, 'INTERNAL', 'Server error');
  }
}

const ref = z.string().trim().min(2).max(120);
const uzs = z.number().int().min(0).max(1_000_000_000_000).optional();
const patchSchema = z.union([
  z.object({ orderId: z.string().uuid(), status: z.literal('verified'), paidUzs: uzs, reference: z.string().trim().max(120).optional() }).strict(),
  z.object({ orderId: z.string().uuid(), status: z.literal('rejected'), reason: z.string().trim().min(3).max(300) }).strict(),
  z.object({ orderId: z.string().uuid(), action: z.enum(['payout_paid', 'refund_done']), reference: ref, amountUzs: uzs }).strict(),
  z.object({ orderId: z.string().uuid(), action: z.literal('refund_rejected'), reference: ref, amountCents: z.number().int().min(1), amountUzs: uzs }).strict(),
]);

/**
 * Approve / reject a receipt (approval opens the workshop's address to the customer), or record
 * a manual bank transfer: the workshop payout, a refund after cancel, or a refund of a rejected payment.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await adminLiveOr401(request);
    if ('response' in auth) return fail(401, 'ADMIN_SESSION_REQUIRED', 'Unauthorized');
    const adminId = auth.adminId;
    const ip = ipOf(request);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Invalid input');
    const body = parsed.data;
    const db = createAdminClient();

    if ('action' in body) {
      const { data, error } =
        body.action === 'payout_paid'
          ? await db.rpc('admin_mark_payout', { p_admin_id: adminId, p_booking_id: body.orderId, p_ip: ip, p_window_hours: CANCEL_WINDOW_HOURS, p_reference: body.reference, p_amount_uzs: body.amountUzs ?? null })
          : body.action === 'refund_done'
          ? await db.rpc('admin_mark_refund', { p_admin_id: adminId, p_booking_id: body.orderId, p_ip: ip, p_reference: body.reference, p_amount_uzs: body.amountUzs ?? null })
          : await db.rpc('admin_refund_rejected', { p_admin_id: adminId, p_booking_id: body.orderId, p_amount_cents: 'amountCents' in body ? body.amountCents : 0, p_reference: body.reference, p_ip: ip, p_amount_uzs: body.amountUzs ?? null });
      const r = data as { success?: boolean; error?: string; until?: string } | null;
      if (error || !r) {
        if (error) console.error('escrow action failed:', error.message);
        return fail(500, 'INTERNAL', 'Server error');
      }
      if (!r.success) {
        const code = r.error ?? 'INVALID_STATE';
        return fail(code === 'NOT_FOUND' ? 404 : 409, code, code, r.until ? { until: r.until } : {});
      }
      await pushBookingEvent(db, body.orderId, body.action === 'payout_paid' ? 'payout_paid' : 'refund_done');
      return NextResponse.json({ success: true });
    }

    const approve = body.status === 'verified';
    const r = await reviewBooking(db, {
      adminId,
      bookingId: body.orderId,
      approve,
      reason: 'reason' in body ? body.reason : null,
      ip,
      paidUzs: 'paidUzs' in body ? body.paidUzs : null,
      reference: 'reference' in body ? body.reference : null,
    });
    if (!r.ok) {
      if (r.error === 'AMOUNT_MISMATCH') {
        const expected = typeof r.expectedUzs === 'number' ? ` (${new Intl.NumberFormat('ru-RU').format(r.expectedUzs)} so‘m)` : '';
        return fail(409, r.error, `To‘langan summa buyurtma summasidan kam${expected}. Chekdagi summani kiriting`, { expectedUzs: r.expectedUzs ?? null });
      }
      const status = r.error === 'NOT_FOUND' ? 404 : r.error === 'FAILED' ? 500 : 409;
      return fail(status, r.error, r.error, r.item ? { item: r.item } : {});
    }
    await syncDecisionToTelegram(body.orderId, approve, 'reason' in body ? body.reason : undefined);
    return NextResponse.json({ success: true, status: r.status });
  } catch (err) {
    console.error('admin escrow PATCH error:', err);
    return fail(500, 'INTERNAL', 'Server error');
  }
}
