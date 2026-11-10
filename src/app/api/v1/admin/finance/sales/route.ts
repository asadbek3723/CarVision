import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { csvResponse, financeRange } from '@/server/admin-finance';

export const dynamic = 'force-dynamic';
const PAGE = 40;

/** Plan and credit sales recorded by admins (payments_manual). `format=csv` exports the period. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const { from, to } = financeRange(params);
    const csv = params.get('format') === 'csv';
    const offset = csv ? 0 : Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
    const limit = csv ? 10_000 : PAGE;
    const db = createAdminClient();

    const { data, count, error } = await db
      .from('payments_manual')
      .select('id, user_id, shop_id, kind, plan_code, credits, amount_minor, currency, method, reference, notes, admin_id, created_at', { count: 'exact' })
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    const profileIds = [...new Set(rows.flatMap((r) => [r.user_id as string, r.admin_id as string]).filter(Boolean))];
    const shopIds = [...new Set(rows.map((r) => r.shop_id as string).filter(Boolean))];
    const [p, s] = await Promise.all([
      profileIds.length ? db.from('profiles').select('id, full_name, phone').in('id', profileIds) : Promise.resolve({ data: [] }),
      shopIds.length ? db.from('shops').select('id, shop_name').in('id', shopIds) : Promise.resolve({ data: [] }),
    ]);
    const person = new Map((p.data ?? []).map((x) => [x.id as string, (x.full_name as string) || (x.phone as string)]));
    const shop = new Map((s.data ?? []).map((x) => [x.id as string, x.shop_name as string]));

    const items = rows.map((r) => ({
      id: r.id as string,
      kind: r.kind as 'PLAN' | 'CREDITS',
      plan: (r.plan_code as string | null) ?? null,
      credits: r.credits as number,
      amountMinor: Number(r.amount_minor),
      currency: r.currency as string,
      method: r.method as string,
      reference: (r.reference as string | null) ?? '',
      notes: (r.notes as string | null) ?? '',
      customer: (r.shop_id ? shop.get(r.shop_id as string) : null) ?? person.get(r.user_id as string) ?? '',
      admin: person.get(r.admin_id as string) ?? '',
      at: r.created_at as string,
    }));

    if (csv) {
      return csvResponse(`sales_${from.slice(0, 10)}_${to.slice(0, 10)}.csv`, [
        ['date', 'kind', 'plan', 'credits', 'amount', 'currency', 'method', 'reference', 'customer', 'admin', 'notes'],
        ...items.map((i) => [i.at, i.kind, i.plan ?? '', i.credits, (i.amountMinor / 100).toFixed(2), i.currency, i.method, i.reference, i.customer, i.admin, i.notes]),
      ]);
    }
    const total = count ?? 0;
    return NextResponse.json({ success: true, total, nextOffset: offset + rows.length < total ? offset + rows.length : null, sales: items });
  } catch (err) {
    console.error('admin sales error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
