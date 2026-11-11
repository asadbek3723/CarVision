/**
 * Cloudflare Turnstile (free CAPTCHA) for sign-up: bots cannot mass-create accounts to farm the
 * free credits. Opt-in: enforced only when TURNSTILE_SECRET_KEY is set, so deploying the code never
 * blocks sign-ups by itself. When it is set, a missing / invalid token or an unreachable Cloudflare
 * fails closed.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

const secretOf = (env: NodeJS.ProcessEnv) => (env['TURNSTILE_SECRET_KEY'] ?? '').trim();

export function turnstileRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return secretOf(env).length > 0;
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const secret = secretOf(env);
  if (!secret) return true;
  if (!token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip && !ip.startsWith('unknown:')) body.set('remoteip', ip);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(VERIFY_URL, { method: 'POST', body, signal: controller.signal });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
