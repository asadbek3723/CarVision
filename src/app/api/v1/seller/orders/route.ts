import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaidSeller } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { fetchBookingItems, fetchBookingRows, type BookingRow } from '@/server/bookings';
import { centsToUsd } from '@/domain/catalog';

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
      voucherCode: cancelled ? '' : r.redemption_code,
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
      totalPayoutUSD: orders.reduce((s, o) => s + (o.status !== 'cancelled' && o.payoutUSD !== null ? o.payoutUSD : 0), 0),
      paidOutUSD: orders.reduce((s, o) => s + (o.payoutStatus === 'paid' && o.payoutUSD !== null ? o.payoutUSD : 0), 0),
    });
  } catch (err) {
    console.error('seller orders GET error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

const redeemSchema = z.object({ code: z.string().trim().min(3).max(20), action: z.enum(['lookup', 'redeem']).default('lookup') });

/** Look up an order by the customer's pickup code (order number or 123-456 code), or hand it over. */
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const parsed = redeemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Kodni kiriting');
    const code = parsed.data.code.replace(/^#/, '');

    const db = createAdminClient();
    if (parsed.data.action === 'redeem') {
      const { data } = await db.rpc('redeem_booking', { p_shop_id: shopId, p_code: code });
      const r = data as { success?: boolean; error?: string; bookingId?: string } | null;
      if (!r?.success) {
        const [msg, code] =
          r?.error === 'ALREADY_REDEEMED'
            ? ['Bu buyurtma avval topshirilgan', 'ALREADY_REDEEMED']
            : r?.error === 'NOT_PAID'
            ? ['To‘lov hali tasdiqlanmagan', 'NOT_PAID']
            : ['Bunday kod topilmadi', 'VOUCHER_NOT_FOUND'];
        return fail(r?.error === 'NOT_FOUND' || !r ? 404 : 409, msg as string, code as string);
      }
      const rows = await fetchBookingRows(db, { shopId, id: r.bookingId, limit: 1 });
      const shop = session.shop!;
      const [order] = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
      return NextResponse.json({ success: true, redeemed: true, order });
    }

    // lookup: exact match on this workshop's own bookings that are paid
    const { data: hit } = await db
      .from('bookings')
      .select('id')
      .eq('shop_id', shopId)
      .in('status', ['UNLOCKED', 'REDEEMED'])
      .or(`booking_number.ilike.${code.replace(/[%,()]/g, '')},redemption_code.eq.${code.replace(/[%,()]/g, '')}`)
      .limit(1)
      .maybeSingle();
    if (!hit) return fail(404, 'Bunday kod topilmadi');
    const rows = await fetchBookingRows(db, { shopId, id: hit.id as string, limit: 1 });
    const shop = session.shop!;
    const [order] = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    return NextResponse.json({ success: true, redeemed: false, order });
  } catch (err) {
    console.error('seller orders POST error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

/** Order detail page "mark completed" = the item was handed over to the customer. */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const parsed = z.object({ orderId: z.string().uuid(), status: z.string() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Ma’lumotlar noto‘g‘ri');
    if (parsed.data.status !== 'completed') return fail(400, 'Faqat "yakunlandi" holati qo‘llab-quvvatlanadi');

    const db = createAdminClient();
    const rows = await fetchBookingRows(db, { shopId, id: parsed.data.orderId, limit: 1 });
    const row = rows[0];
    if (!row) return fail(404, 'Buyurtma topilmadi');
    const { data } = await db.rpc('redeem_booking', { p_shop_id: shopId, p_code: row.redemption_code });
    const r = data as { success?: boolean; error?: string } | null;
    if (!r?.success && r?.error !== 'ALREADY_REDEEMED') return fail(409, 'Holatni o‘zgartirib bo‘lmadi');
    const fresh = await fetchBookingRows(db, { shopId, id: row.id, limit: 1 });
    const shop = session.shop!;
    const [order] = await toSellerOrders(fresh, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('seller orders PATCH error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}
