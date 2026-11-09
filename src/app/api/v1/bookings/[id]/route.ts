import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { cancelPurchase, fetchBookingRows, paymentDetails, toCustomerDTOs, withUzs } from '@/server/bookings';

export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Buyurtma topilmadi' }, { status: 404 });

/** One order of the signed-in customer (used to poll the approval status). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return notFound();

  const db = createAdminClient();
  const rows = await fetchBookingRows(db, { userId: guard.value.userId, id, limit: 1 });
  if (rows.length === 0) return notFound();
  const uzsRate = (await getServerRates())['UZS'] ?? 13000;
  const [dto] = withUzs(await toCustomerDTOs(db, rows), uzsRate);
  const payment = paymentDetails();
  return NextResponse.json({
    success: true,
    booking: dto,
    payment: payment ? { configured: true, ...payment } : { configured: false },
  });
}

/**
 * Customer cancels an order. Unpaid orders are simply closed. A paid order can be cancelled
 * only for a short time after the payment was approved and before it was handed over; the
 * database applies the rules and records the refund for the admin.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return notFound();

  const db = createAdminClient();
  const { data } = await db
    .from('bookings')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', guard.value.userId)
    .eq('status', 'AWAITING_PAYMENT')
    .select('id')
    .maybeSingle();
  if (data) return NextResponse.json({ success: true });

  const r = await cancelPurchase(db, guard.value.userId, id);
  if (r.ok) return NextResponse.json({ success: true });
  if (r.error === 'NOT_FOUND') return notFound();
  return NextResponse.json({ success: false, code: 'CANNOT_CANCEL', error: 'Bu buyurtmani endi bekor qilib bo‘lmaydi' }, { status: 409 });
}
