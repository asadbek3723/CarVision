import type { NextRequest } from 'next/server';
import type { createAdminClient } from '@/lib/supabase/server';

/**
 * "Server · 6 locks" on the admin security page. The app runs on Vercel + Supabase (no VM), so each
 * classic server control maps to its platform equivalent (SECURITY.md has the steps). A lock is
 * green only when it can be seen to be on:
 *  - auto:   read from the running deployment / database;
 *  - manual: a dashboard setting the app cannot read, confirmed by an env flag once it is done.
 */
export type LockId = 'stableDomain' | 'https' | 'ports' | 'keyOnlyAccess' | 'privateDb' | 'waf';

export interface SecurityLock {
  id: LockId;
  ok: boolean;
  source: 'auto' | 'manual';
}

type Db = ReturnType<typeof createAdminClient>;
type Env = Record<string, string | undefined>;

export const SECURITY_MIGRATION = '20261120000000_security_hardening';

function isHttpsUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return u.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname);
  } catch {
    return false;
  }
}

/** Pure part (unit-tested): everything except the database marker. */
export function evaluateLocks(input: { env: Env; requestIsHttps: boolean; privateDb: boolean }): SecurityLock[] {
  const { env } = input;
  const onVercel = env['VERCEL'] === '1';
  return [
    // Elastic IP -> a fixed production address: the production domain.
    { id: 'stableDomain', ok: isHttpsUrl(env['VERCEL_PROJECT_PRODUCTION_URL']) || isHttpsUrl(env['NEXT_PUBLIC_APP_URL']), source: 'auto' },
    // SSL -> this request arrived over HTTPS (HSTS + upgrade-insecure-requests are sent by next.config).
    { id: 'https', ok: input.requestIsHttps && env['NODE_ENV'] === 'production', source: 'auto' },
    // Only 80/443 -> Vercel exposes nothing else; the database ports are closed in Supabase.
    { id: 'ports', ok: onVercel && env['SEC_DB_NETWORK_RESTRICTED'] === '1', source: 'manual' },
    // SSH key-only -> no server login exists; every account that can deploy uses 2FA.
    { id: 'keyOnlyAccess', ok: env['SEC_2FA_CONFIRMED'] === '1', source: 'manual' },
    // VPC -> the browser has no database access (anon / authenticated privileges revoked).
    { id: 'privateDb', ok: input.privateDb, source: 'auto' },
    // WAF -> Vercel Firewall rules are on.
    { id: 'waf', ok: onVercel && env['SEC_WAF_CONFIRMED'] === '1', source: 'manual' },
  ];
}

export async function securityLocks(db: Db, request: NextRequest, env: Env = process.env): Promise<SecurityLock[]> {
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
  const { data, error } = await db.from('security_migrations').select('name').eq('name', SECURITY_MIGRATION).maybeSingle();
  return evaluateLocks({ env, requestIsHttps: proto === 'https', privateDb: !error && Boolean(data) });
}
