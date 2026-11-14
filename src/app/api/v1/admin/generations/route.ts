import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { summarizeQuality, type QualityRow, type StoredCheck } from '@/server/render-quality';

const BASE_COLUMNS =
  'id, user_id, status, provider, angle_key, duration_ms, credits_charged, credit_state, error_message, preview_url, output_4k_url, created_at';
/** Columns of the `render_quality` migration. Until it is applied the monitor works without them. */
const QUALITY_COLUMNS = 'render_check, feedback, feedback_reason, feedback_note, feedback_at';
const QUALITY_SAMPLE = 5000;

const missingColumn = (e: { code?: string; message?: string } | null) =>
  Boolean(e) && (e!.code === '42703' || e!.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(e!.message ?? ''));

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
    const listQuery = (withQuality: boolean) => {
      const disliked = status === 'DISLIKED';
      let q = db
        .from('generations')
        .select(withQuality ? `${BASE_COLUMNS}, ${QUALITY_COLUMNS}` : BASE_COLUMNS, { count: 'exact' })
        .order(disliked && withQuality ? 'feedback_at' : 'created_at', { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'PROCESSING') q = q.eq('status', status);
      if (status === 'UNSETTLED') q = q.eq('credit_state', 'RESERVED').lt('created_at', new Date(Date.now() - 5 * 60_000).toISOString());
      // Without the quality columns nobody can have marked a render yet: the list is empty.
      if (disliked) q = withQuality ? q.not('feedback', 'is', null) : q.eq('id', '00000000-0000-0000-0000-000000000000');
      return q;
    };
    const qualityQuery = () =>
      db
        .from('generations')
        .select('provider, parts, render_check, feedback')
        .gte('created_at', since30)
        .in('status', ['COMPLETED', 'FAILED'])
        .order('created_at', { ascending: false })
        .limit(QUALITY_SAMPLE);

    const [firstList, statsRes, qualityRes] = await Promise.all([
      listQuery(true),
      db.rpc('admin_generation_stats', { p_from: since30 }),
      qualityQuery(),
    ]);
    const qualityReady = !missingColumn(firstList.error) && !missingColumn(qualityRes.error);
    const { data: recentRaw, count, error } = missingColumn(firstList.error) ? await listQuery(false) : firstList;
    if (error) throw new Error(error.message);
    if (statsRes.error) throw new Error(statsRes.error.message);
    if (qualityRes.error && qualityReady) console.warn('render quality query failed:', qualityRes.error.message);
    const recent = (recentRaw ?? []) as unknown as Array<Record<string, unknown>>;
    const st = statsRes.data as { total: number; completed: number; failed: number; avgMs: number | null; creditsCommitted: number; creditsRefunded: number; unsettled: number; byProvider: Record<string, number> };
    const quality = qualityReady && !qualityRes.error ? summarizeQuality((qualityRes.data ?? []) as unknown as QualityRow[]) : null;

    const userIds = [...new Set(recent.map((g) => g.user_id as string))];
    const { data: users } = userIds.length ? await db.from('profiles').select('id, full_name, phone').in('id', userIds) : { data: [] };
    const userById = new Map((users ?? []).map((u) => [u.id as string, u]));
    const total = count ?? 0;
    const done = Number(st.completed);
    const failed = Number(st.failed);

    return NextResponse.json({
      success: true,
      total,
      nextOffset: offset + recent.length < total ? offset + recent.length : null,
      quality,
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
      items: recent.map((g) => {
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
          check: (g.render_check as StoredCheck | null | undefined) ?? null,
          feedback: g.feedback
            ? {
                reason: (g.feedback_reason as string | null) ?? null,
                note: (g.feedback_note as string | null) ?? null,
                at: (g.feedback_at as string | null) ?? null,
              }
            : null,
        };
      }),
    });
  } catch (err) {
    console.error('admin generations error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
