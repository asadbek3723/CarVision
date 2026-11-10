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
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
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
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
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
