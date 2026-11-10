import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaidSeller } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { fetchBookingItems, fetchBookingRows, type BookingRow } from '@/server/bookings';
import { centsToUsd } from '@/domain/catalog';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';

const fail = (status: number, error: string, code?: string) => NextResponse.json({ success: false, code, error }, { status });

type SellerStatus = 'pending' | 'verified' | 'completed' | 'cancelled';
const STATUS_MAP: Record<string, SellerStatus> = { UNLOCKED: 'verified', REDEEMED: 'completed', CANCELLED: 'cancelled' };
type SellerPayout = 'pending' | 'paid' | 'none';
const PAYOUT_MAP: Record<string, SellerPayout> = { PENDING: 'pending', PAID: 'paid' };

/** Orders a workshop may see: paid ones, and paid ones the customer later cancelled. */
const SELLER_STATUSES = ['UNLOCKED', 'REDEEMED', 'CANCELLED'] as const;
const visibleToSeller = (r: BookingRow) => r.status !== 'CANCELLED' || r.unlocked_at !== null;

/**
 * Workshop orders. A workshop only sees an order once the customer's payment was approved:
 * customer contact is never shown earlier, nor after the customer cancelled. The workshop sees
 * what it will receive (payout) and whether the platform already transferred it.
 */
async function toSellerOrders(rows: BookingRow[], shopName: string, shopAddress: string, shopPhone: string) {
  const db = createAdminClient();
  const items = await fetchBookingItems(db, rows.map((r) => r.id));
  const uzs = (await getServerRates())['UZS'] ?? 13000;
  return rows.map((r) => {
    const its = items.filter((i) => i.booking_id === r.id);
    const total = centsToUsd(r.total_cents);
    // Old deposit-era orders have no payout: the customer paid the workshop directly.
    const payout = r.payout_cents !== null ? centsToUsd(r.payout_cents) : null;
    const cancelled = r.status === 'CANCELLED';
    return {
      id: r.id,
      orderNumber: r.booking_number,
      // The pickup code belongs to the customer: it proves the hand-over, so the workshop never sees it.
      voucherCode: '',
      customerName: r.customer_name,
      customerPhone: cancelled ? '' : r.customer_phone,
      totalPriceUSD: total,
      totalPriceUZS: Math.round(total * uzs),
      payoutUSD: payout,
      payoutUZS: payout !== null ? Math.round(payout * uzs) : null,
      payoutStatus: PAYOUT_MAP[r.payout_status] ?? ('none' as SellerPayout),
      payoutPaidAt: r.payout_paid_at,
      paymentMethod: 'Bank',
      status: STATUS_MAP[r.status] ?? ('cancelled' as SellerStatus),
      appointmentDate: r.unlocked_at ?? r.created_at,
      itemsCount: its.length,
      primaryItemName: its[0]?.name ?? '',
      primaryItemImage: its[0]?.image_url ?? '',
      partName: its.map((i) => i.name).join(', '),
      studioName: shopName,
      studioAddress: shopAddress,
      studioPhone: shopPhone,
      note: cancelled ? '' : r.customer_note ?? '',
      createdAt: r.created_at,
      items: its.map((i, idx) => ({ id: `${r.id}-${idx}`, product_name: i.name, price: centsToUsd(i.unit_cents), quantity: i.quantity, product_image_url: i.image_url })),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const orderId = new URL(request.url).searchParams.get('orderId');
    if (orderId && !z.string().uuid().safeParse(orderId).success) return fail(404, 'Topilmadi');

    const rows = (await fetchBookingRows(createAdminClient(), { shopId, id: orderId ?? undefined, statuses: [...SELLER_STATUSES], limit: 100 })).filter(visibleToSeller);
    const shop = session.shop!;
    const orders = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    return NextResponse.json({
      success: true,
      orders,
      order: orderId ? orders[0] ?? null : undefined,
      count: orders.length,
      // Summed in integer cents, converted once (no floating-point drift).
      totalPayoutUSD: centsToUsd(rows.reduce((s, r) => s + (r.status !== 'CANCELLED' && r.payout_cents !== null ? r.payout_cents : 0), 0)),
      paidOutUSD: centsToUsd(rows.reduce((s, r) => s + (r.payout_status === 'PAID' && r.payout_cents !== null ? r.payout_cents : 0), 0)),
    });
  } catch (err) {
    console.error('seller orders GET error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

const CODE_RE = /^\d{3}-?\d{3}$/;
const normCode = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 6 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : null;
};
const redeemSchema = z.object({ code: z.string().trim().min(3).max(20), action: z.enum(['lookup', 'redeem']).default('lookup'), orderId: z.string().uuid().optional() });

/** Wrong codes per workshop per 15 minutes before the terminal locks (stops guessing codes). */
const MAX_CODE_FAILURES = 10;
const CODE_WINDOW_MS = 15 * 60 * 1000;

async function codeLocked(shopId: string): Promise<boolean> {
  return (await recentFailures('login_key', `redeem:${shopId}`, 'redeem_code', CODE_WINDOW_MS, false, true)) >= MAX_CODE_FAILURES;
}

/**
 * Hands an order over. Only the customer's pickup code works (the workshop cannot see it), so the
 * hand-over proves the customer was there. Returns the fresh order or an error response.
 */
async function redeemWithCode(request: NextRequest, shopId: string, rawCode: string, orderId: string | undefined) {
  const db = createAdminClient();
  if (await codeLocked(shopId)) return { response: fail(429, 'Ko‘p marta noto‘g‘ri kod kiritildi. 15 daqiqadan keyin urinib ko‘ring', 'RATE_LIMITED') };
  const code = normCode(rawCode);
  if (!code || !CODE_RE.test(code)) {
    await recordAttempt('redeem_code', `redeem:${shopId}`, clientIp(request), false);
    return { response: fail(404, 'Bunday kod topilmadi', 'VOUCHER_NOT_FOUND') };
  }
  const { data, error } = await db.rpc('redeem_booking', { p_shop_id: shopId, p_code: code, p_booking_id: orderId ?? null });
  if (error) {
    console.error('redeem_booking failed:', error.message);
    return { response: fail(500, 'Serverda xatolik yuz berdi') };
  }
  const r = data as { success?: boolean; error?: string; bookingId?: string } | null;
  if (!r?.success) {
    if (r?.error === 'ALREADY_REDEEMED') return { response: fail(409, 'Bu buyurtma avval topshirilgan', 'ALREADY_REDEEMED') };
    await recordAttempt('redeem_code', `redeem:${shopId}`, clientIp(request), false);
    return { response: fail(404, 'Bunday kod topilmadi', 'VOUCHER_NOT_FOUND') };
  }
  return { bookingId: r.bookingId as string };
}

/** Look up a paid order by the customer's pickup code, or hand it over with that code. */
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const parsed = redeemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Kodni kiriting');
    const shop = session.shop!;
    const db = createAdminClient();

    if (parsed.data.action === 'redeem') {
      const res = await redeemWithCode(request, shopId, parsed.data.code, parsed.data.orderId);
      if ('response' in res) return res.response;
      const rows = await fetchBookingRows(db, { shopId, id: res.bookingId, limit: 1 });
      const [order] = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
      return NextResponse.json({ success: true, redeemed: true, order });
    }

    // lookup: exact pickup-code match on this workshop's own paid orders
    if (await codeLocked(shopId)) return fail(429, 'Ko‘p marta noto‘g‘ri kod kiritildi. 15 daqiqadan keyin urinib ko‘ring', 'RATE_LIMITED');
    const code = normCode(parsed.data.code);
    const { data: hit } = code
      ? await db.from('bookings').select('id').eq('shop_id', shopId).in('status', ['UNLOCKED', 'REDEEMED']).eq('redemption_code', code).limit(1).maybeSingle()
      : { data: null };
    if (!hit) {
      await recordAttempt('redeem_code', `redeem:${shopId}`, clientIp(request), false);
      return fail(404, 'Bunday kod topilmadi', 'VOUCHER_NOT_FOUND');
    }
    const rows = await fetchBookingRows(db, { shopId, id: hit.id as string, limit: 1 });
    const [order] = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    // The code was typed by the workshop from the customer, so it may be echoed back for the hand-over step.
    return NextResponse.json({ success: true, redeemed: false, order: order ? { ...order, voucherCode: code } : order });
  } catch (err) {
    console.error('seller orders POST error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

/** Order detail page "mark completed" = handed over; needs the customer's pickup code. */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const parsed = z
      .object({ orderId: z.string().uuid(), status: z.literal('completed'), code: z.string().trim().min(3).max(20) })
      .safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Mijozning olib ketish kodini kiriting', 'CODE_REQUIRED');

    const res = await redeemWithCode(request, shopId, parsed.data.code, parsed.data.orderId);
    if ('response' in res) return res.response;
    const db = createAdminClient();
    const fresh = await fetchBookingRows(db, { shopId, id: res.bookingId, limit: 1 });
    const shop = session.shop!;
    const [order] = await toSellerOrders(fresh, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('seller orders PATCH error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}
