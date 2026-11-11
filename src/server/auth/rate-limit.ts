import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { clientIpFromHeaders } from '@/lib/client-ip';

/**
 * Persistent (database backed) attempt limiter. Works across serverless instances,
 * unlike an in-memory Map.
 */

export function clientIp(request: NextRequest): string {
  const h = request.headers;
  // Only headers the platform writes (see client-ip.ts): a forged x-forwarded-for is ignored on Vercel.
  const ip = clientIpFromHeaders(h);
  if (ip) return ip;
  // No address at all: do not let every such client share one bucket. Partition by a fingerprint.
  const fp = `${h.get('user-agent') ?? ''}|${h.get('accept-language') ?? ''}`;
  return `unknown:${createHash('sha256').update(fp).digest('hex').slice(0, 16)}`;
}

export async function recentFailures(
  column: 'login_key' | 'ip',
  value: string,
  kind: string,
  windowMs: number,
  success = false,
  failClosed = false
): Promise<number> {
  const db = createAdminClient();
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await db
    .from('auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .eq('kind', kind)
    .eq('success', success)
    .gte('created_at', since);
  if (error) {
    console.error('auth_attempts read failed:', error.message);
    // Sensitive endpoints (admin PIN) must lock instead of silently losing brute-force protection.
    if (failClosed) return Number.POSITIVE_INFINITY;
  }
  return count ?? 0;
}

export async function recordAttempt(kind: string, loginKey: string, ip: string, success: boolean): Promise<void> {
  try {
    const db = createAdminClient();
    const { error } = await db.from('auth_attempts').insert({ kind, login_key: loginKey, ip, success });
    if (error) console.error('auth_attempts insert failed (rate limiting degraded):', error.message);
  } catch {
    // Logging must never break the request, but a failure must be visible (it disables rate limiting).
  }
}
