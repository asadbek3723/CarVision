/**
 * Edge-runtime safe (Web Crypto only, no Node `crypto`) verification of the admin session cookie.
 * The middleware uses this to reject forged / expired admin cookies before any route code runs.
 * The token format is produced by `createAdminSessionToken` in `admin-auth.ts`:
 *   `<userId>.<issuedAt>.<hmac-sha256-hex>` over `carvision_admin:<userId>:<issuedAt>`.
 */

export const ADMIN_COOKIE_NAME = 'cv_admin_session';
export const ADMIN_SESSION_SECONDS = 4 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length-safe constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns the admin user id when the token is authentic and unexpired, else null. Never throws. */
export async function verifyAdminTokenEdge(
  token: string | undefined | null,
  secret: string | undefined | null = process.env.ADMIN_SESSION_SECRET,
  nowMs: number = Date.now()
): Promise<string | null> {
  try {
    if (!secret || secret.length < MIN_SECRET_LENGTH || !token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [adminUserId, tsStr, signature] = parts as [string, string, string];
    if (!adminUserId || !signature || !/^\d+$/.test(tsStr)) return null;

    const issuedAt = parseInt(tsStr, 10);
    const now = Math.floor(nowMs / 1000);
    if (now - issuedAt > ADMIN_SESSION_SECONDS || issuedAt > now + 60) return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`carvision_admin:${adminUserId}:${issuedAt}`));
    return safeEqual(toHex(mac), signature) ? adminUserId : null;
  } catch {
    return null;
  }
}
