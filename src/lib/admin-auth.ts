import crypto from 'crypto';
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS } from './admin-token-edge';

export { ADMIN_COOKIE_NAME };

/**
 * Admin second factor. An admin must (1) be signed in with a Supabase account whose
 * server-set app_metadata.role is `super_admin` and (2) enter the PIN. There are NO
 * default secrets: if ADMIN_MASTER_PIN / ADMIN_SESSION_SECRET are missing the admin
 * area is closed (fails closed).
 */

const SESSION_DURATION_SECONDS = ADMIN_SESSION_SECONDS; // 4 hours
const MIN_SECRET_LENGTH = 32;
const MIN_PIN_LENGTH = 6;

function sessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_MASTER_PIN && process.env.ADMIN_MASTER_PIN.length >= MIN_PIN_LENGTH && sessionSecret());
}

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

/** Constant-time PIN check against ADMIN_MASTER_PIN (false when not configured). */
export function verifyPinConstantTime(candidatePin: string): boolean {
  const master = process.env.ADMIN_MASTER_PIN;
  if (!master || master.length < MIN_PIN_LENGTH || typeof candidatePin !== 'string') return false;
  return crypto.timingSafeEqual(sha256(candidatePin), sha256(master));
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** Signed token bound to the admin's user id: `<userId>.<issuedAt>.<hmac>`. */
export function createAdminSessionToken(adminUserId: string, nowMs: number = Date.now()): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = `carvision_admin:${adminUserId}:${issuedAt}`;
  return `${adminUserId}.${issuedAt}.${sign(payload, secret)}`;
}

/** Returns the admin user id when the token is valid and unexpired, else null. */
export function getAdminIdFromToken(token: string | undefined | null, nowMs: number = Date.now()): string | null {
  const secret = sessionSecret();
  if (!secret || !token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [adminUserId, tsStr, signature] = parts as [string, string, string];
  if (!adminUserId || !signature || !/^\d+$/.test(tsStr)) return null;

  const issuedAt = parseInt(tsStr, 10);
  const now = Math.floor(nowMs / 1000);
  if (now - issuedAt > SESSION_DURATION_SECONDS || issuedAt > now + 60) return null;

  const expected = sign(`carvision_admin:${adminUserId}:${issuedAt}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return adminUserId;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  return getAdminIdFromToken(token) !== null;
}

export function getAdminCookieOptions() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  };
}
