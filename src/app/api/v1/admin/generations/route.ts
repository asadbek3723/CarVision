import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';

export const dynamic = 'force-dynamic';

/** AI render monitor: real generations, success rate, providers and credit use. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const db = createAdminClient();
    const params = new URL(request.url).searchParams;
    const offset = Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
    const status = params.get('status');
    const PAGE = 30;
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    let list = db
      .from('generations')
      .select('id, user_id, status, provider, angle_key, duration_ms, credits_charged, credit_state, error_message, preview_url, output_4k_url, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'PROCESSING') list = list.eq('status', status);
    if (status === 'UNSETTLED') list = list.eq('credit_state', 'RESERVED').lt('created_at', new Date(Date.now() - 5 * 60_000).toISOString());
    const [{ data: recent, count, error }, statsRes] = await Promise.all([list, db.rpc('admin_generation_stats', { p_from: since30 })]);
    if (error) throw new Error(error.message);
    if (statsRes.error) throw new Error(statsRes.error.message);
    const st = statsRes.data as { total: number; completed: number; failed: number; avgMs: number | null; creditsCommitted: number; creditsRefunded: number; unsettled: number; byProvider: Record<string, number> };

    const userIds = [...new Set((recent ?? []).map((g) => g.user_id as string))];
    const { data: users } = userIds.length ? await db.from('profiles').select('id, full_name, phone').in('id', userIds) : { data: [] };
    const userById = new Map((users ?? []).map((u) => [u.id as string, u]));
    const total = count ?? 0;
    const done = Number(st.completed);
    const failed = Number(st.failed);

    return NextResponse.json({
      success: true,
      total,
      nextOffset: offset + (recent?.length ?? 0) < total ? offset + (recent?.length ?? 0) : null,
      stats: {
        total: Number(st.total),
        completed: done,
        failed,
        successRate: done + failed ? Math.round((done / (done + failed)) * 100) : null,
        avgSeconds: st.avgMs ? Math.round(Number(st.avgMs) / 100) / 10 : null,
        creditsCommitted: Number(st.creditsCommitted),
        creditsRefunded: Number(st.creditsRefunded),
        unsettled: Number(st.unsettled),
        byProvider: st.byProvider ?? {},
      },
      items: (recent ?? []).map((g) => {
        const u = userById.get(g.user_id as string);
        return {
          id: g.id as string,
          user: (u?.full_name as string) || (u?.phone as string) || '—',
          status: g.status as string,
          provider: (g.provider as string | null) ?? null,
          angle: (g.angle_key as string | null) ?? null,
          seconds: g.duration_ms ? Math.round(((g.duration_ms as number) / 1000) * 10) / 10 : null,
          credits: g.credits_charged as number,
          creditState: g.credit_state as string,
          error: (g.error_message as string | null) ?? null,
          imageUrl: (g.preview_url as string | null) ?? (g.output_4k_url as string | null) ?? null,
          createdAt: g.created_at as string,
        };
      }),
    });
  } catch (err) {
    console.error('admin generations error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
