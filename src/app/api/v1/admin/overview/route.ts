import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, dayKey, lastDays } from '@/server/admin';
import { CANCEL_WINDOW_HOURS } from '@/domain/money';

export const dynamic = 'force-dynamic';

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const db = createAdminClient();
    if (request.nextUrl.searchParams.get('lite') === '1') {
      const { count: pendingOnly } = await db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_ADMIN_APPROVAL');
      return NextResponse.json({ success: true, pending: pendingOnly ?? 0 });
    }
    const now = new Date().toISOString();
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const head = { count: 'exact' as const, head: true };

    const [users, sellers, shops, paidShops, items, pending, unlocked, redeemed, gensOk, gensFailed, auditRows, signups, gens, books, finance] = await Promise.all([
      count(db.from('profiles').select('id', head)),
      count(db.from('profiles').select('id', head).eq('role', 'b2b_seller')),
      count(db.from('shops').select('id', head)),
      count(db.from('shops').select('id', head).neq('current_plan_code', 'FREE_TRIAL').gt('plan_expires_at', now)),
      count(db.from('catalog_items').select('id', head).eq('status', 'PUBLISHED')),
      count(db.from('bookings').select('id', head).eq('status', 'PENDING_ADMIN_APPROVAL')),
      count(db.from('bookings').select('id', head).eq('status', 'UNLOCKED')),
      count(db.from('bookings').select('id', head).eq('status', 'REDEEMED')),
      count(db.from('generations').select('id', head).eq('status', 'COMPLETED').gte('created_at', since30)),
      count(db.from('generations').select('id', head).eq('status', 'FAILED').gte('created_at', since30)),
      db.from('admin_audit_log').select('id, action, target_entity, created_at, admin_id').order('created_at', { ascending: false }).limit(6),
      db.from('profiles').select('created_at').gte('created_at', since7).limit(5000),
      db.from('generations').select('created_at, status').gte('created_at', since7).limit(5000),
      db.from('bookings').select('created_at').gte('created_at', since7).limit(5000),
      // Exact sums in SQL (no row caps): last 30 days, plus live balances.
      db.rpc('admin_finance_summary', { p_from: since30, p_to: new Date(Date.now() + 60_000).toISOString(), p_window_hours: CANCEL_WINDOW_HOURS }),
    ]);
    if (finance.error) throw new Error(finance.error.message);
    const f = finance.data as { grossCents: number; commissionEarnedCents: number; commissionInWindowCents: number; cancelRetainedCents: number; payoutsOwedCents: number; creditsUsed: number };

    const days = lastDays(7);
    const series = (rows: Array<{ created_at: string }> | null) => {
      const m = new Map(days.map((d) => [d, 0]));
      for (const r of rows ?? []) {
        const k = dayKey(r.created_at);
        if (m.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return days.map((d) => ({ day: d, value: m.get(d) ?? 0 }));
    };

    // Earned = commission that can no longer be cancelled away, plus what is kept on cancellations.
    const commissionCents = Number(f.commissionEarnedCents) + Number(f.cancelRetainedCents);
    const dealCents = Number(f.grossCents);
    const payoutsOwedCents = Number(f.payoutsOwedCents);
    const creditsUsed = Number(f.creditsUsed);

    // Recent admin actions with admin phone
    const adminIds = [...new Set((auditRows.data ?? []).map((a) => a.admin_id as string))];
    const { data: admins } = adminIds.length ? await db.from('profiles').select('id, phone, full_name').in('id', adminIds) : { data: [] };
    const adminName = new Map((admins ?? []).map((a) => [a.id as string, (a.full_name as string) || (a.phone as string)]));

    return NextResponse.json({
      success: true,
      metrics: {
        users, sellers, shops, paidShops, freeShops: shops - paidShops, publishedItems: items,
        bookings: { pending, unlocked, redeemed },
        commissionUSD: commissionCents / 100,
        commissionInWindowUSD: Number(f.commissionInWindowCents) / 100,
        payoutsOwedUSD: payoutsOwedCents / 100,
        dealUSD: dealCents / 100,
        renders30d: { completed: gensOk, failed: gensFailed, creditsUsed },
      },
      charts: { signups: series(signups.data), renders: series(gens.data), bookings: series(books.data) },
      recentAdminActions: (auditRows.data ?? []).map((a) => ({
        id: a.id as string,
        action: a.action as string,
        entity: a.target_entity as string,
        admin: adminName.get(a.admin_id as string) ?? '—',
        at: a.created_at as string,
      })),
    });
  } catch (err) {
    console.error('admin overview error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
