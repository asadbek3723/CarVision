import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSeller } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { fetchBookingItems, fetchBookingRows, type BookingRow } from '@/server/bookings';
import { centsToUsd } from '@/domain/catalog';

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

type SellerStatus = 'pending' | 'verified' | 'completed' | 'cancelled';
const STATUS_MAP: Record<string, SellerStatus> = { UNLOCKED: 'verified', REDEEMED: 'completed' };

/**
 * Workshop leads. A workshop only sees a booking once the customer's deposit was approved
 * (UNLOCKED) or the voucher was already redeemed: customer contact is never shown earlier.
 */
async function toSellerOrders(rows: BookingRow[], shopName: string, shopAddress: string, shopPhone: string) {
  const db = createAdminClient();
  const items = await fetchBookingItems(db, rows.map((r) => r.id));
  const uzs = (await getServerRates())['UZS'] ?? 13000;
  return rows.map((r) => {
    const its = items.filter((i) => i.booking_id === r.id);
    const total = centsToUsd(r.total_cents);
    const deposit = centsToUsd(r.deposit_cents);
    return {
      id: r.id,
      orderNumber: r.booking_number,
      voucherCode: r.redemption_code,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      totalPriceUSD: total,
      totalPriceUZS: Math.round(total * uzs),
      depositUSD: deposit,
      depositUZS: Math.round(deposit * uzs),
      remainingUSD: Math.max(0, total - deposit),
      remainingUZS: Math.round(Math.max(0, total - deposit) * uzs),
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
      note: r.customer_note ?? '',
      createdAt: r.created_at,
      items: its.map((i, idx) => ({ id: `${r.id}-${idx}`, product_name: i.name, price: centsToUsd(i.unit_cents), quantity: i.quantity, product_image_url: i.image_url })),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const orderId = new URL(request.url).searchParams.get('orderId');
    if (orderId && !z.string().uuid().safeParse(orderId).success) return fail(404, 'Topilmadi');

    const rows = await fetchBookingRows(createAdminClient(), { shopId, id: orderId ?? undefined, statuses: ['UNLOCKED', 'REDEEMED'], limit: 100 });
    const shop = session.shop!;
    const orders = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    return NextResponse.json({
      success: true,
      orders,
      order: orderId ? orders[0] ?? null : undefined,
      count: orders.length,
      totalDepositUSD: orders.reduce((s, o) => s + o.depositUSD, 0),
    });
  } catch (err) {
    console.error('seller orders GET error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

const redeemSchema = z.object({ code: z.string().trim().min(3).max(20), action: z.enum(['lookup', 'redeem']).default('lookup') });

/** Look up or redeem a customer's voucher code (booking number or 123-456 code). */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const parsed = redeemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Vaucher kodini kiriting');
    const code = parsed.data.code.replace(/^#/, '');

    const db = createAdminClient();
    if (parsed.data.action === 'redeem') {
      const { data } = await db.rpc('redeem_booking', { p_shop_id: shopId, p_code: code });
      const r = data as { success?: boolean; error?: string; bookingId?: string } | null;
      if (!r?.success) {
        const msg = r?.error === 'ALREADY_REDEEMED' ? 'Bu vaucher avval qabul qilingan' : r?.error === 'NOT_PAID' ? 'Zakalat hali tasdiqlanmagan' : 'Bunday vaucher kodi topilmadi';
        return fail(r?.error === 'NOT_FOUND' || !r ? 404 : 409, msg);
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
    if (!hit) return fail(404, 'Bunday vaucher kodi topilmadi');
    const rows = await fetchBookingRows(db, { shopId, id: hit.id as string, limit: 1 });
    const shop = session.shop!;
    const [order] = await toSellerOrders(rows, shop.shop_name, shop.exact_address || `${shop.city}, ${shop.district}`, shop.phone);
    return NextResponse.json({ success: true, redeemed: false, order });
  } catch (err) {
    console.error('seller orders POST error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

/** Order detail page "mark completed" = redeem the voucher. */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireSeller();
    if (!guard.ok) return guard.response;
    const { session, shopId } = guard.value;
    const parsed = z.object({ orderId: z.string().uuid(), status: z.string() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Ma’lumotlar noto‘g‘ri');
    if (parsed.data.status !== 'completed') return fail(400, 'Faqat "yakunlandi" holati qo‘llab-quvvatlanadi');

    const db = createAdminClient();
    const rows = await fetchBookingRows(db, { shopId, id: parsed.data.orderId, limit: 1 });
    const row = rows[0];
    if (!row) return fail(404, 'Bron topilmadi');
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
