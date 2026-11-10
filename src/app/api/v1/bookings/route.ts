import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { normalizePhone } from '@/server/auth/phone';
import { expireUnpaid, fetchBookingRows, paymentDetails, toCustomerDTOs, withUzs } from '@/server/bookings';
import { PLATFORM_COMMISSION_BPS } from '@/domain/money';


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
    await expireUnpaid(db);

    // Optional client key: a retried or double-tapped checkout returns the same orders.
    const idemRaw = request.headers.get('idempotency-key')?.trim() ?? '';
    const idemKey = /^[A-Za-z0-9-]{8,64}$/.test(idemRaw) ? idemRaw : null;

    const rates = await getServerRates();
    const uzsRate = rates['UZS'] ?? null;
    const payment = paymentDetails();

    // One database transaction: prices and stock are read there, one order per workshop.
    const { data, error } = await db.rpc('create_purchase', {
      p_user_id: session.userId,
      p_shop_of_user: session.shop?.id ?? null,
      p_items: parsed.data.items,
      p_name: parsed.data.customerName,
      p_phone: phone,
      p_note: parsed.data.note ?? null,
      p_idem_key: idemKey,
      p_fx_rate: uzsRate,
      p_commission_bps: PLATFORM_COMMISSION_BPS,
      p_max_open: MAX_OPEN_UNPAID,
    });
    const r = data as { success?: boolean; error?: string; ids?: string[]; item?: string } | null;
    if (error || !r) {
      if (error) console.error('create_purchase failed:', error.message);
      return fail(500, 'INTERNAL', 'Buyurtma yaratib bo‘lmadi');
    }
    if (!r.success) {
      const map: Record<string, [number, string]> = {
        TOO_MANY_OPEN: [429, 'To‘lanmagan buyurtmalaringiz ko‘p. Avval ularni yakunlang'],
        ITEM_UNAVAILABLE: [409, 'Savatdagi ba’zi detallar endi mavjud emas. Savatni yangilang'],
        OUT_OF_STOCK: [409, r.item ? `"${r.item}" omborda yetarli emas` : 'Omborda yetarli emas'],
        OWN_SHOP: [400, 'O‘z ustaxonangiz detalini sotib ololmaysiz'],
        FREE_ITEMS: [400, 'Narxi 0 bo‘lgan detalni sotib olib bo‘lmaydi'],
      };
      const [status, msg] = map[r.error ?? ''] ?? [500, 'Buyurtma yaratib bo‘lmadi'];
      return fail(status, r.error ?? 'INTERNAL', msg);
    }
    const created = (r.ids ?? []).map((id) => ({ id }));

    const dtos = await toCustomerDTOs(db, await fetchBookingRows(db, { userId: session.userId, ids: created.map((c) => c.id), limit: 50 }));
    return NextResponse.json(
      {
        success: true,
        bookings: withUzs(dtos, uzsRate ?? 13000),
        payment: payment ? { configured: true, ...payment } : { configured: false },
        uzsRate: uzsRate ?? 13000,
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
    await expireUnpaid(db);
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

