import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';
import { securityLocks } from '@/server/security-locks';

export const dynamic = 'force-dynamic';

const GROUPS: Record<string, string[]> = {
  money: ['APPROVE_PAYMENT', 'REJECT_PAYMENT', 'APPROVE_DEPOSIT', 'REJECT_DEPOSIT', 'MARK_PAYOUT_PAID', 'MARK_REFUND_DONE', 'REFUND_REJECTED', 'SET_PAYOUT_DETAILS'],
  credits: ['ASSIGN_PLAN', 'ADJUST_CREDITS', 'OPEN_GARAGE'],
  access: ['ADMIN_LOGIN', 'ADMIN_LOGOUT', 'BAN_USER', 'UNBAN_USER', 'VERIFY_SHOP', 'UNVERIFY_SHOP'],
};

/** Admin action log (paged, filterable by group) + recent failed sign-in / PIN attempts. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const db = createAdminClient();
    const params = new URL(request.url).searchParams;
    const offset = Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
    const group = params.get('group');
    const PAGE = 40;
    const since24 = new Date(Date.now() - 86_400_000).toISOString();
    let actionsQ = db
      .from('admin_audit_log')
      .select('id, admin_id, action, target_entity, target_id, payload_after, ip_address, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (group && GROUPS[group]) actionsQ = actionsQ.in('action', GROUPS[group]);
    const [{ data: audit, count: auditTotal }, { data: attempts }, { count: failed24 }, { count: pinFailed24 }, locks] = await Promise.all([
      actionsQ,
      db.from('auth_attempts').select('id, kind, login_key, ip, success, created_at').eq('success', false).order('created_at', { ascending: false }).limit(60),
      db.from('auth_attempts').select('id', { count: 'exact', head: true }).eq('success', false).gte('created_at', since24),
      db.from('auth_attempts').select('id', { count: 'exact', head: true }).eq('success', false).eq('kind', 'admin_pin').gte('created_at', since24),
      securityLocks(db, request),
    ]);

    const adminIds = [...new Set((audit ?? []).map((a) => a.admin_id as string))];
    const { data: admins } = adminIds.length ? await db.from('profiles').select('id, full_name, phone').in('id', adminIds) : { data: [] };
    const adminName = new Map((admins ?? []).map((a) => [a.id as string, (a.full_name as string) || (a.phone as string)]));

    // Mask the middle of phone numbers in the failed-attempt list
    const mask = (k: string) => (/^\+?\d{9,}$/.test(k) ? `${k.slice(0, 6)}***${k.slice(-2)}` : k.startsWith('admin:') ? 'admin' : k.startsWith('redeem:') ? 'pickup code' : k);

    return NextResponse.json({
      success: true,
      stats: { failed24h: failed24 ?? 0, pinFailed24h: pinFailed24 ?? 0 },
      locks,
      total: auditTotal ?? 0,
      nextOffset: offset + (audit?.length ?? 0) < (auditTotal ?? 0) ? offset + (audit?.length ?? 0) : null,
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
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
