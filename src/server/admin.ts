import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminIdFromToken } from '@/lib/admin-auth';

/** Every admin API starts here: a valid, unexpired admin session cookie (login + PIN). */
export function adminOr401(request: NextRequest): { adminId: string } | { response: NextResponse } {
  const adminId = getAdminIdFromToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!adminId) {
    return { response: NextResponse.json({ success: false, code: 'ADMIN_SESSION_REQUIRED', error: 'Admin sessiyasi tugagan' }, { status: 401 }) };
  }
  return { adminId };
}

export function ipOf(request: NextRequest): string {
  return (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').slice(0, 45);
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
