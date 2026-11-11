/**
 * Supabase session cookies. The browser never talks to Supabase directly (every call goes through
 * /api/v1 on our server), so page scripts never need the token: HttpOnly keeps it away from any
 * injected script, Secure keeps it off plain HTTP. `@supabase/ssr` defaults to httpOnly: false and a
 * 400-day lifetime; an active user's cookie is refreshed long before 90 days run out.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 90 * 24 * 60 * 60,
};
