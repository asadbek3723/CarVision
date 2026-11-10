import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { CANCEL_WINDOW_HOURS } from '@/domain/money';
import { financeRange } from '@/server/admin-finance';

export const dynamic = 'force-dynamic';

/** Money summary for a period (exact SQL sums) plus what each workshop is owed right now. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const { from, to } = financeRange(new URL(request.url).searchParams);
    const db = createAdminClient();
    const [summary, byShop] = await Promise.all([
      db.rpc('admin_finance_summary', { p_from: from, p_to: to, p_window_hours: CANCEL_WINDOW_HOURS }),
      db.rpc('admin_payouts_by_shop', { p_window_hours: CANCEL_WINDOW_HOURS }),
    ]);
    if (summary.error) throw new Error(summary.error.message);
    if (byShop.error) throw new Error(byShop.error.message);
    return NextResponse.json({
      success: true,
      from,
      to,
      summary: summary.data,
      payoutsByShop: ((byShop.data ?? []) as Array<{ shop_id: string; shop_name: string; payout_details: string | null; orders: number; owed_cents: number; due_now_cents: number }>).map((r) => ({
        shopId: r.shop_id,
        shopName: r.shop_name,
        payoutDetails: r.payout_details,
        orders: Number(r.orders),
        owedCents: Number(r.owed_cents),
        dueNowCents: Number(r.due_now_cents),
      })),
    });
  } catch (err) {
    console.error('admin finance error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
