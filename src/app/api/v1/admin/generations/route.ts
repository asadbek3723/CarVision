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
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: recent }, { data: month }] = await Promise.all([
      db.from('generations').select('id, user_id, status, provider, angle_key, duration_ms, credits_charged, credit_state, error_message, preview_url, output_4k_url, created_at').order('created_at', { ascending: false }).limit(60),
      db.from('generations').select('status, provider, duration_ms, credits_charged, credit_state').gte('created_at', since30).limit(10000),
    ]);

    const userIds = [...new Set((recent ?? []).map((g) => g.user_id as string))];
    const { data: users } = userIds.length ? await db.from('profiles').select('id, full_name, phone').in('id', userIds) : { data: [] };
    const userById = new Map((users ?? []).map((u) => [u.id as string, u]));

    const all = month ?? [];
    const completed = all.filter((g) => g.status === 'COMPLETED');
    const failed = all.filter((g) => g.status === 'FAILED').length;
    const byProvider: Record<string, number> = {};
    for (const g of completed) byProvider[(g.provider as string) || '—'] = (byProvider[(g.provider as string) || '—'] ?? 0) + 1;
    const durations = completed.map((g) => g.duration_ms as number | null).filter((n): n is number => typeof n === 'number' && n > 0);

    return NextResponse.json({
      success: true,
      stats: {
        total: all.length,
        completed: completed.length,
        failed,
        successRate: all.length ? Math.round((completed.length / Math.max(1, completed.length + failed)) * 100) : null,
        avgSeconds: durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 1000) * 10) / 10 : null,
        creditsCommitted: all.filter((g) => g.credit_state === 'COMMITTED').reduce((s, g) => s + (g.credits_charged as number), 0),
        creditsRefunded: all.filter((g) => g.credit_state === 'REFUNDED').reduce((s, g) => s + (g.credits_charged as number), 0),
        byProvider,
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
