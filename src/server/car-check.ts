import crypto from 'node:crypto';

/**
 * Proof that the customer's photos were checked ("it is a car, all sides are the same car").
 * `/api/v1/vehicles/detect` signs a short-lived token for the signed-in user when the check does
 * not fail; `/api/v1/generations` requires it before a credit is reserved. It is bound to the user,
 * not to the photo (photos are re-compressed before upload), so it is an extra barrier before
 * paying for a render, not a full guarantee.
 *
 * Opt-in: enforcement only exists when CAR_CHECK_SECRET (16+ characters) is configured, so
 * deploying the code can never lock customers out by itself.
 */
const TTL_MS = 6 * 60 * 60 * 1000;
const MIN_SECRET = 16;

const secretOf = (env: NodeJS.ProcessEnv) => (env['CAR_CHECK_SECRET'] ?? '').trim();

export function carCheckRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return secretOf(env).length >= MIN_SECRET;
}

function mac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** `<expiresAt>.<signature>`, or null when enforcement is not configured. */
export function signCarCheck(userId: string, now = Date.now(), env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = secretOf(env);
  if (secret.length < MIN_SECRET) return null;
  const exp = now + TTL_MS;
  return `${exp}.${mac(secret, `${userId}.${exp}`)}`;
}

export function verifyCarCheck(
  token: string | undefined,
  userId: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const secret = secretOf(env);
  if (secret.length < MIN_SECRET) return true; // not enforced
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < now) return false;
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(secret, `${userId}.${exp}`));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
