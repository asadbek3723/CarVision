import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing, locales } from './i18n/routing';
import { ADMIN_COOKIE_NAME, verifyAdminTokenEdge } from './lib/admin-token-edge';

const intlMiddleware = createMiddleware(routing);

/**
 * Server-level admin protection. Runs before any page or route handler:
 *  - /{locale}/admin/*     : only a signed-in Supabase user whose server-set app_metadata.role is
 *                            `super_admin` gets the page. Everyone else gets a plain 404, so the
 *                            admin area does not even reveal that it exists.
 *  - /api/v1/admin/*       : needs a valid, unexpired, HMAC-signed PIN session cookie (except the
 *                            PIN / status / logout endpoints), same-origin for state changes.
 *  - Optional ADMIN_ALLOWED_IPS (comma separated) restricts both to those client IPs.
 * Route handlers re-check everything (defense in depth); this layer just closes the door early.
 */

const LOCALE_PREFIX = new RegExp(`^/(${locales.join('|')})(?=/|$)`);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isAdminPage(pathname: string): boolean {
  const rest = pathname.replace(LOCALE_PREFIX, '');
  return rest === '/admin' || rest.startsWith('/admin/');
}

function localeOf(pathname: string): string {
  return LOCALE_PREFIX.exec(pathname)?.[1] ?? routing.defaultLocale;
}

/** Platform-set headers first: Vercel / Cloudflare overwrite them, so the client cannot forge them. */
function clientIp(request: NextRequest): string {
  const h = request.headers;
  return (h.get('x-vercel-forwarded-for') || h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || '').trim();
}

/** Empty / unset ADMIN_ALLOWED_IPS = no IP restriction. */
function ipAllowed(request: NextRequest): boolean {
  const allowed = (process.env.ADMIN_ALLOWED_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.length === 0 || allowed.includes(clientIp(request));
}

function hardenAdminResponse<T extends NextResponse>(response: T): T {
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

function notFoundPage(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${localeOf(request.nextUrl.pathname)}/__not-found`;
  url.search = '';
  return hardenAdminResponse(NextResponse.rewrite(url, { status: 404 }));
}

function jsonError(status: number, code: string, error: string): NextResponse {
  return hardenAdminResponse(NextResponse.json({ success: false, code, error }, { status }));
}

async function gateAdminApi(request: NextRequest): Promise<NextResponse> {
  if (!ipAllowed(request)) return jsonError(404, 'NOT_FOUND', 'Not found');

  if (UNSAFE_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (origin) {
      let sameOrigin = false;
      try {
        sameOrigin = new URL(origin).host === host;
      } catch {
        sameOrigin = false;
      }
      if (!sameOrigin) return jsonError(403, 'CROSS_ORIGIN', 'Cross-origin request blocked');
    }
  }

  // PIN / status / logout must work before a PIN session exists; each of them checks the login itself.
  const isAuthEndpoint = request.nextUrl.pathname.startsWith('/api/v1/admin/auth/');
  if (!isAuthEndpoint) {
    const adminId = await verifyAdminTokenEdge(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!adminId) return jsonError(401, 'ADMIN_SESSION_REQUIRED', 'Admin sessiyasi tugagan');
  }
  return hardenAdminResponse(NextResponse.next());
}

async function gateAdminPage(request: NextRequest): Promise<NextResponse> {
  if (!ipAllowed(request)) return notFoundPage(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return notFoundPage(request);

  // Render through next-intl first, then verify the user. Supabase may refresh an expired access
  // token here, so refreshed cookies are written back onto this response.
  const response = intlMiddleware(request);
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) => {
          for (const { name, value, options } of list) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options ?? {});
          }
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.['role'] !== 'super_admin') return notFoundPage(request);
  } catch {
    return notFoundPage(request);
  }
  return hardenAdminResponse(response);
}

/** Supabase SSR keeps the session in `sb-<project>-auth-token` (split into `.0`, `.1`... when long). */
const AUTH_COOKIE = /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/;
const LANDING = new RegExp(`^/(?:(${locales.join('|')})/?)?$`);

/** Reads the role from the session cookie without a network call (routing only, never trusted for access). */
function sessionRole(request: NextRequest): string | null | undefined {
  const parts = request.cookies
    .getAll()
    .filter((c) => AUTH_COOKIE.test(c.name) && c.value)
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  if (parts.length === 0) return undefined; // signed out
  try {
    let raw = parts.map((c) => c.value).join('');
    if (raw.startsWith('base64-')) raw = atob(raw.slice(7).replace(/-/g, '+').replace(/_/g, '/'));
    const session = JSON.parse(raw) as { access_token?: string; refresh_token?: string };
    if (!session.refresh_token && !session.access_token) return undefined;
    const payload = session.access_token?.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { app_metadata?: { role?: string } };
    return claims.app_metadata?.role ?? null;
  } catch {
    return null; // a session cookie we cannot read: still signed in as far as routing goes
  }
}

/**
 * Signed-in visitors never see the landing page: opening the site's link takes them straight into
 * the app, decided here on the server before any HTML is sent (no flash, one redirect). Visitors
 * without a session (and search engines) get the landing page as before.
 */
function skipLandingForSignedIn(request: NextRequest): NextResponse | null {
  const match = LANDING.exec(request.nextUrl.pathname);
  if (!match || request.method !== 'GET') return null;
  const role = sessionRole(request);
  if (role === undefined) return null;
  const preferred = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = match[1] ?? (preferred && (locales as readonly string[]).includes(preferred) ? preferred : routing.defaultLocale);
  const url = request.nextUrl.clone();
  url.pathname = role === 'super_admin' ? `/${locale}/admin` : `/${locale}/seller`;
  const response = NextResponse.redirect(url, 307);
  // Per-visitor answer: never let a CDN keep it for everyone.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

/**
 * The installed app always opens its manifest `start_url`, which carries the language it was
 * installed in (`/uz/seller?source=pwa`), and iOS never refreshes it. Without this, next-intl would
 * render that old language and write it back into NEXT_LOCALE, undoing the user's choice in
 * Settings. So a PWA launch follows the saved NEXT_LOCALE instead of the URL's locale.
 */
function followSavedLocaleOnPwaLaunch(request: NextRequest): NextResponse | null {
  if (request.method !== 'GET' || request.nextUrl.searchParams.get('source') !== 'pwa') return null;
  const preferred = request.cookies.get('NEXT_LOCALE')?.value;
  if (!preferred || !(locales as readonly string[]).includes(preferred)) return null;
  const current = LOCALE_PREFIX.exec(request.nextUrl.pathname)?.[1];
  if (!current || current === preferred) return null;
  const url = request.nextUrl.clone();
  url.pathname = request.nextUrl.pathname.replace(LOCALE_PREFIX, `/${preferred}`);
  const response = NextResponse.redirect(url, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/v1/admin/')) return gateAdminApi(request);

  const pwaLaunch = followSavedLocaleOnPwaLaunch(request);
  if (pwaLaunch) return pwaLaunch;

  if (isAdminPage(pathname)) return gateAdminPage(request);

  const intoApp = skipLandingForSignedIn(request);
  if (intoApp) return intoApp;

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/api/v1/admin/:path*', '/((?!api|_next|_vercel|models|audio|.*\\..*).*)'],
};
