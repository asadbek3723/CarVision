import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';

export const dynamic = 'force-dynamic';

/** Admin action log + recent failed sign-in / PIN attempts. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const db = createAdminClient();
    const since24 = new Date(Date.now() - 86_400_000).toISOString();
    const [{ data: audit }, { data: attempts }, { count: failed24 }, { count: pinFailed24 }] = await Promise.all([
      db.from('admin_audit_log').select('id, admin_id, action, target_entity, target_id, payload_after, ip_address, created_at').order('created_at', { ascending: false }).limit(80),
      db.from('auth_attempts').select('id, kind, login_key, ip, success, created_at').eq('success', false).order('created_at', { ascending: false }).limit(60),
      db.from('auth_attempts').select('id', { count: 'exact', head: true }).eq('success', false).gte('created_at', since24),
      db.from('auth_attempts').select('id', { count: 'exact', head: true }).eq('success', false).eq('kind', 'admin_pin').gte('created_at', since24),
    ]);

    const adminIds = [...new Set((audit ?? []).map((a) => a.admin_id as string))];
    const { data: admins } = adminIds.length ? await db.from('profiles').select('id, full_name, phone').in('id', adminIds) : { data: [] };
    const adminName = new Map((admins ?? []).map((a) => [a.id as string, (a.full_name as string) || (a.phone as string)]));

    // Mask the middle of phone numbers in the failed-attempt list
    const mask = (k: string) => (/^\+?\d{9,}$/.test(k) ? `${k.slice(0, 6)}***${k.slice(-2)}` : k.startsWith('admin:') ? 'admin akkaunt' : k);

    return NextResponse.json({
      success: true,
      stats: { failed24h: failed24 ?? 0, pinFailed24h: pinFailed24 ?? 0 },
      actions: (audit ?? []).map((a) => ({
        id: a.id as string,
        action: a.action as string,
        entity: a.target_entity as string,
        admin: adminName.get(a.admin_id as string) ?? '—',
        ip: (a.ip_address as string | null) ?? '',
        details: a.payload_after as Record<string, unknown> | null,
        at: a.created_at as string,
      })),
      failedAttempts: (attempts ?? []).map((a) => ({
        id: a.id as string,
        kind: a.kind as string,
        who: mask(a.login_key as string),
        ip: (a.ip as string | null) ?? '',
        at: a.created_at as string,
      })),
    });
  } catch (err) {
    console.error('admin audit error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
