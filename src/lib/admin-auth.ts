import crypto from 'crypto';

const MASTER_PIN = process.env.ADMIN_MASTER_PIN || '3723';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'carvision_admin_secret_hmac_key_99812_secure';
export const ADMIN_COOKIE_NAME = 'cv_admin_session';
const SESSION_DURATION_SECONDS = 4 * 60 * 60; // 4 hours

// Rate limiter for brute-force protection
interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Checks rate limiting for PIN verification attempts.
 */
export function checkPinRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  if (entry && entry.lockedUntil <= now) {
    rateLimitMap.delete(ip);
  }

  const currentAttempts = entry ? entry.attempts : 0;
  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - currentAttempts),
  };
}

/**
 * Records a failed attempt for the given IP.
 */
export function recordFailedPinAttempt(ip: string): {
  isLocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || (entry.lockedUntil > 0 && entry.lockedUntil <= now)) {
    entry = { attempts: 1, lockedUntil: 0 };
  } else {
    entry.attempts += 1;
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitMap.set(ip, entry);
    return {
      isLocked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  rateLimitMap.set(ip, entry);
  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - entry.attempts,
  };
}

/**
 * Clears rate limiting on successful PIN verification.
 */
export function clearPinRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Verifies candidate PIN against server master PIN using constant-time comparison.
 */
export function verifyPinConstantTime(candidatePin: string): boolean {
  if (typeof candidatePin !== 'string' || candidatePin.length !== MASTER_PIN.length) {
    return false;
  }

  const candidateBuf = Buffer.from(candidatePin);
  const masterBuf = Buffer.from(MASTER_PIN);

  try {
    return crypto.timingSafeEqual(candidateBuf, masterBuf);
  } catch {
    return false;
  }
}

/**
 * Generates signed HMAC token for the session.
 */
export function createAdminSessionToken(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `carvision_admin:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies signed session token.
 */
export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [tsStr, signature] = parts;
  if (!tsStr || !signature) return false;

  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > SESSION_DURATION_SECONDS || timestamp > now + 60) {
    return false; // Expired or future timestamp
  }

  const expectedPayload = `carvision_admin:${timestamp}`;
  const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(expectedPayload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

/**
 * Standard cookie options for setting the admin session cookie.
 */
export function getAdminCookieOptions() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  };
}
