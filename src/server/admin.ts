import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminTokenInfo } from '@/lib/admin-auth';
import { getSuperAdminId } from '@/server/auth/session';
import { createAdminClient } from '@/lib/supabase/server';
import { clientIp } from '@/server/auth/rate-limit';

const expired = () => ({ response: NextResponse.json({ success: false, code: 'ADMIN_SESSION_REQUIRED', error: 'Admin session expired' }, { status: 401 }) });

/** Every admin API starts here: a valid, unexpired admin session cookie (login + PIN). */
export function adminOr401(request: NextRequest): { adminId: string } | { response: NextResponse } {
  const info = getAdminTokenInfo(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  return info ? { adminId: info.adminId } : expired();
}

/** True when the admin logged out (or was signed out) after this token was issued. Fails closed. */
export async function isAdminTokenRevoked(adminId: string, issuedAt: number): Promise<boolean> {
  const { data, error } = await createAdminClient().from('admin_session_revocations').select('revoked_before').eq('admin_id', adminId).maybeSingle();
  if (error) {
    // Table missing (migration not applied yet) must not lock every admin out; any other error fails closed.
    if (/admin_session_revocations/.test(error.message) && /does not exist|schema cache/i.test(error.message)) return false;
    console.error('admin revocation check failed:', error.message);
    return true;
  }
  if (!data?.revoked_before) return false;
  // Tokens are stamped in whole seconds: one issued in the same second as the logout (a fresh login) stays valid.
  return Math.floor(new Date(data.revoked_before as string).getTime() / 1000) > issuedAt;
}

/**
 * Strongest guard for admin APIs: valid PIN session cookie, not revoked by a logout, AND the same
 * account is still a signed-in super_admin right now. A demoted / signed-out admin loses access at once.
 */
export async function adminLiveOr401(request: NextRequest): Promise<{ adminId: string } | { response: NextResponse }> {
  const info = getAdminTokenInfo(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!info) return expired();
  const [liveId, revoked] = await Promise.all([getSuperAdminId(), isAdminTokenRevoked(info.adminId, info.issuedAt)]);
  if (liveId !== info.adminId || revoked) return expired();
  return { adminId: info.adminId };
}

/** Client address for audit rows: platform-set headers first (they cannot be forged by the client). */
export function ipOf(request: NextRequest): string {
  return clientIp(request).slice(0, 45);
}

/** Tashkent day key (UTC+5) for charts. */
export function dayKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return d.toISOString().slice(0, 10);
}

export function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.now() + 5 * 3600_000 - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}
