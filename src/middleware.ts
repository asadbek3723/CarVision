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

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
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

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/v1/admin/')) return gateAdminApi(request);
  if (isAdminPage(pathname)) return gateAdminPage(request);

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/api/v1/admin/:path*', '/((?!api|_next|_vercel|models|audio|.*\\..*).*)'],
};
