import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { normalizePhone } from '@/server/auth/phone';
import { fetchBookingRows, newBookingNumber, newRedemptionCode, paymentDetails, toCustomerDTOs, withUzs } from '@/server/bookings';
import { splitPurchase } from '@/domain/money';


const MAX_OPEN_UNPAID = 10;

const bodySchema = z
  .object({
    items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(20).default(1) })).min(1).max(30),
    customerName: z.string().trim().min(2).max(100),
    customerPhone: z.string().trim().min(7).max(30),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

/**
 * Creates one order per workshop from the cart. Prices come from the database only.
 * The customer then pays the full price to the platform card and uploads the receipt.
 * The platform's commission is recorded here and never returned to the customer.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const session = guard.value;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Ism va telefon raqamni to‘g‘ri kiriting');
    const phone = normalizePhone(parsed.data.customerPhone);
    if (!phone) return fail(400, 'INVALID_PHONE', 'Telefon raqam noto‘g‘ri');

    const db = createAdminClient();

    const { count: unpaid } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .eq('status', 'AWAITING_PAYMENT');
    if ((unpaid ?? 0) >= MAX_OPEN_UNPAID) return fail(429, 'TOO_MANY_OPEN', 'To‘lanmagan buyurtmalaringiz ko‘p. Avval ularni yakunlang');

    // Merge duplicate ids, then load real items
    const qtyById = new Map<string, number>();
    for (const i of parsed.data.items) qtyById.set(i.id, Math.min(20, (qtyById.get(i.id) ?? 0) + i.quantity));
    const { data: rows } = await db
      .from('catalog_items')
      .select('id, shop_id, name, brand, price_cents, stock, cover_image_url, status')
      .in('id', [...qtyById.keys()])
      .eq('status', 'PUBLISHED');
    const found = rows ?? [];
    if (found.length !== qtyById.size) return fail(409, 'ITEM_UNAVAILABLE', 'Savatdagi ba’zi detallar endi mavjud emas. Savatni yangilang');
    const soldOut = found.find((r) => (r.stock as number) < (qtyById.get(r.id as string) ?? 1));
    if (soldOut) return fail(409, 'OUT_OF_STOCK', `"${soldOut.name as string}" omborda yetarli emas`);

    // A user cannot book from their own workshop
    if (session.shop && found.some((r) => r.shop_id === session.shop!.id)) {
      return fail(400, 'OWN_SHOP', 'O‘z ustaxonangiz detalini sotib ololmaysiz');
    }

    const byShop = new Map<string, typeof found>();
    for (const r of found) byShop.set(r.shop_id as string, [...(byShop.get(r.shop_id as string) ?? []), r]);

    const rates = await getServerRates();
    const payment = paymentDetails();
    const created: Array<{ id: string }> = [];

    for (const [shopId, list] of byShop) {
      const total = list.reduce((sum, r) => sum + (r.price_cents as number) * (qtyById.get(r.id as string) ?? 1), 0);
      if (total <= 0) return fail(400, 'FREE_ITEMS', 'Narxi 0 bo‘lgan detalni sotib olib bo‘lmaydi');
      const split = splitPurchase(total);

      // Retry on the (very unlikely) unique collision of booking number / voucher code
      let bookingId: string | null = null;
      for (let attempt = 0; attempt < 4 && !bookingId; attempt++) {
        const { data: booking, error } = await db
          .from('bookings')
          .insert({
            booking_number: newBookingNumber(),
            user_id: session.userId,
            shop_id: shopId,
            status: 'AWAITING_PAYMENT',
            total_cents: total,
            amount_cents: split.amountCents,
            commission_cents: split.commissionCents,
            payout_cents: split.payoutCents,
            redemption_code: newRedemptionCode(),
            customer_name: parsed.data.customerName,
            customer_phone: phone,
            customer_note: parsed.data.note ?? null,
          })
          .select('id')
          .single();
        if (!error && booking) bookingId = booking.id as string;
        else if (error && !/duplicate|unique/i.test(error.message)) {
          console.error('booking insert failed:', error.message);
          return fail(500, 'INTERNAL', 'Buyurtma yaratib bo‘lmadi');
        }
      }
      if (!bookingId) return fail(500, 'INTERNAL', 'Buyurtma yaratib bo‘lmadi');

      const { error: itemsErr } = await db.from('booking_items').insert(
        list.map((r) => ({
          booking_id: bookingId,
          item_id: r.id,
          name: r.name,
          brand: r.brand ?? null,
          image_url: r.cover_image_url ?? null,
          unit_cents: r.price_cents,
          quantity: qtyById.get(r.id as string) ?? 1,
        }))
      );
      if (itemsErr) {
        await db.from('bookings').delete().eq('id', bookingId);
        return fail(500, 'INTERNAL', 'Buyurtma yaratib bo‘lmadi');
      }
      created.push({ id: bookingId });
    }

    const dtos = await toCustomerDTOs(db, await fetchBookingRows(db, { userId: session.userId, ids: created.map((c) => c.id), limit: 50 }));
    const uzsRate = rates['UZS'] ?? 13000;

    return NextResponse.json(
      {
        success: true,
        bookings: withUzs(dtos, uzsRate),
        payment: payment ? { configured: true, ...payment } : { configured: false },
        uzsRate,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('bookings POST error:', err);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
}

/** The signed-in customer's bookings. */
export async function GET() {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    const db = createAdminClient();
    const rows = await fetchBookingRows(db, { userId: guard.value.userId, limit: 50 });
    const rates = await getServerRates();
    const uzsRate = rates['UZS'] ?? 13000;
    const dtos = await toCustomerDTOs(db, rows);
    const payment = paymentDetails();
    return NextResponse.json({
      success: true,
      bookings: withUzs(dtos, uzsRate),
      payment: payment ? { configured: true, ...payment } : { configured: false },
    });
  } catch (err) {
    console.error('bookings GET error:', err);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
}

