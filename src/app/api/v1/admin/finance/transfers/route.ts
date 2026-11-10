import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { csvResponse, financeRange } from '@/server/admin-finance';

export const dynamic = 'force-dynamic';
const PAGE = 40;

/** Journal of manual bank transfers (workshop payouts and customer refunds). `format=csv` exports the period. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const { from, to } = financeRange(params);
    const kind = params.get('kind');
    const csv = params.get('format') === 'csv';
    const offset = csv ? 0 : Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
    const limit = csv ? 10_000 : PAGE;
    const db = createAdminClient();

    let q = db
      .from('payout_transfers')
      .select('id, booking_id, shop_id, kind, amount_cents, amount_uzs, reference, admin_id, created_at', { count: 'exact' })
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (kind === 'PAYOUT' || kind === 'REFUND') q = q.eq('kind', kind);
    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    const bookingIds = [...new Set(rows.map((r) => r.booking_id as string))];
    const shopIds = [...new Set(rows.map((r) => r.shop_id as string).filter(Boolean))];
    const adminIds = [...new Set(rows.map((r) => r.admin_id as string))];
    const [b, s, a] = await Promise.all([
      bookingIds.length ? db.from('bookings').select('id, booking_number, customer_name').in('id', bookingIds) : Promise.resolve({ data: [] }),
      shopIds.length ? db.from('shops').select('id, shop_name').in('id', shopIds) : Promise.resolve({ data: [] }),
      adminIds.length ? db.from('profiles').select('id, full_name, phone').in('id', adminIds) : Promise.resolve({ data: [] }),
    ]);
    const booking = new Map((b.data ?? []).map((x) => [x.id as string, x]));
    const shop = new Map((s.data ?? []).map((x) => [x.id as string, x.shop_name as string]));
    const admin = new Map((a.data ?? []).map((x) => [x.id as string, (x.full_name as string) || (x.phone as string)]));

    const items = rows.map((r) => ({
      id: r.id as string,
      kind: r.kind as 'PAYOUT' | 'REFUND',
      orderNumber: (booking.get(r.booking_id as string)?.booking_number as string) ?? '',
      customer: (booking.get(r.booking_id as string)?.customer_name as string) ?? '',
      shop: shop.get(r.shop_id as string) ?? '',
      amountCents: r.amount_cents as number,
      amountUzs: r.amount_uzs !== null ? Number(r.amount_uzs) : null,
      reference: r.reference as string,
      admin: admin.get(r.admin_id as string) ?? '',
      at: r.created_at as string,
    }));

    if (csv) {
      return csvResponse(`transfers_${from.slice(0, 10)}_${to.slice(0, 10)}.csv`, [
        ['date', 'kind', 'order', 'workshop', 'customer', 'amount_usd', 'amount_uzs', 'reference', 'admin'],
        ...items.map((i) => [i.at, i.kind, i.orderNumber, i.shop, i.customer, (i.amountCents / 100).toFixed(2), i.amountUzs ?? '', i.reference, i.admin]),
      ]);
    }
    const total = count ?? 0;
    return NextResponse.json({ success: true, total, nextOffset: offset + rows.length < total ? offset + rows.length : null, transfers: items });
  } catch (err) {
    console.error('admin transfers error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
