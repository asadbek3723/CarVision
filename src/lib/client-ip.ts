/**
 * The caller's IP for rate limits and the admin IP allowlist. Only headers the hosting platform
 * itself writes are trusted; a header the client can send itself would let an attacker pick a new
 * "IP" per request and walk past every limit.
 *  - On Vercel (VERCEL=1): x-vercel-forwarded-for / x-real-ip, both set by Vercel's edge.
 *  - Behind a Cloudflare proxy (TRUST_CLOUDFLARE_IP=1): cf-connecting-ip.
 *  - Anywhere else (local dev, a plain reverse proxy that overwrites it): x-real-ip, then the first
 *    x-forwarded-for hop.
 * Edge-safe (no Node APIs), shared by the middleware and the route handlers.
 */
type HeaderReader = { get(name: string): string | null };

export function clientIpFromHeaders(h: HeaderReader, env: Record<string, string | undefined> = process.env): string {
  const first = (v: string | null) => (v ?? '').split(',')[0]?.trim() ?? '';
  let ip = '';
  if (env['VERCEL'] === '1') {
    ip = first(h.get('x-vercel-forwarded-for')) || first(h.get('x-real-ip'));
  } else if (env['TRUST_CLOUDFLARE_IP'] === '1') {
    ip = first(h.get('cf-connecting-ip'));
  } else {
    ip = first(h.get('x-real-ip')) || first(h.get('x-forwarded-for'));
  }
  return ip.slice(0, 64);
}
