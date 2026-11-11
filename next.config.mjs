import path from 'node:path';
import { fileURLToPath } from 'node:url';
import withSerwistInit from '@serwist/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const isProd = process.env.NODE_ENV === 'production';

// Only this project's storage may be resized by /_next/image (not every *.supabase.co project).
function supabaseHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || '*.supabase.co';
  } catch {
    return '*.supabase.co';
  }
}
const SUPABASE_HOST = supabaseHost();

/**
 * Content Security Policy.
 *  - Enforced: directives that cannot break the app but close whole attack classes (plugins,
 *    <base> hijack, forms posting elsewhere, clickjacking, mixed content).
 *  - Report-only: the full allowlist. The browser console reports anything outside it, so it can be
 *    switched to enforced once a release shows no reports. (Enforcing a nonce-based script-src would
 *    make every page dynamic and drop the static caching.)
 */
const CSP_ENFORCED = [
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.fal.media https://fal.media https://storage.googleapis.com`,
  "font-src 'self' data:",
  "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com https://challenges.cloudflare.com",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

// Static files under /public: browsers keep them for a week and refresh them in the background
// for another month, so repeat visits cost no network wait yet a replaced file still shows up.
const IMMUTABLE = 'public, max-age=604800, stale-while-revalidate=2592000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  // This folder is the project root, even when it sits inside another checkout (git worktree)
  // that has its own lockfile.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  images: {
    qualities: [70, 75],
    // AVIF/WebP are 30-60% smaller than the original JPEG/PNG; optimized copies are cached for 30 days.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Part photos live in Supabase storage; only that public bucket path may be resized.
    remotePatterns: [{ protocol: 'https', hostname: SUPABASE_HOST, pathname: '/storage/v1/object/public/**' }],
    // Phone-first widths: a 2-column phone card needs ~384px, the product photo ~828px.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [64, 128, 256, 384],
  },
  compiler: {
    // Console noise costs time on phones; errors and warnings stay.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    // Screens already fetched are reused for a while when opened again (and a part's page that was
    // prefetched is ready the moment its card is tapped), so opening something never depends on a
    // network round trip that could fail and make the browser reload the page.
    staleTimes: { dynamic: 60, static: 300 },
    // Import only the icons / animation helpers that are used instead of whole packages.
    optimizePackageImports: ['lucide-react', 'framer-motion', 'next-intl'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Clickjacking: no other site may frame the app (booking / payment buttons). Admin pages already send DENY.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: CSP_ENFORCED },
          ...(isProd ? [{ key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY }] : []),
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
        ],
      },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
      { source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
      { source: '/audio/:path*', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
      { source: '/icons/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
