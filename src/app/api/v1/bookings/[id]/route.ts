import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { escrowDetails, fetchBookingRows, toCustomerDTOs } from '@/server/bookings';

export const dynamic = 'force-dynamic';

/** One booking of the signed-in customer (used to poll the approval status). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ success: false, error: 'Topilmadi' }, { status: 404 });

  const db = createAdminClient();
  const rows = await fetchBookingRows(db, { userId: guard.value.userId, id, limit: 1 });
  if (rows.length === 0) return NextResponse.json({ success: false, error: 'Bron topilmadi' }, { status: 404 });
  const [dto] = await toCustomerDTOs(db, rows);
  const uzsRate = (await getServerRates())['UZS'] ?? 13000;
  return NextResponse.json({
    success: true,
    booking: { ...dto!, depositUZS: Math.round(dto!.depositUSD * uzsRate) },
    payment: escrowDetails() ? { configured: true, ...escrowDetails() } : { configured: false },
  });
}

/** Customer cancels a booking that has not been paid yet. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ success: false, error: 'Topilmadi' }, { status: 404 });

  const { data } = await createAdminClient()
    .from('bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', id)
    .eq('user_id', guard.value.userId)
    .eq('status', 'AWAITING_PAYMENT')
    .select('id')
    .maybeSingle();
  if (!data) return NextResponse.json({ success: false, error: 'Bekor qilib bo‘lmaydi' }, { status: 409 });
  return NextResponse.json({ success: true });
}
