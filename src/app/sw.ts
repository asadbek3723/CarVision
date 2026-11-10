import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkOnly, ExpirationPlugin } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const LOCALES = ['uz', 'ru', 'en', 'ar', 'tr', 'kk', 'ky', 'tg'] as const;
// Bump when the offline page content changes so installed apps refresh their copy.
const OFFLINE_REVISION = '2026-11-04-1';

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    ...LOCALES.map((l) => ({ url: `/${l}/offline`, revision: OFFLINE_REVISION })),
  ],
  // A navigation that fails offline shows the localized offline page, not a browser error
  fallbacks: {
    entries: [
      ...LOCALES.map((l) => ({
        url: `/${l}/offline`,
        matcher: ({ request }: { request: Request }) => request.destination === 'document' && new URL(request.url).pathname.startsWith(`/${l}`),
      })),
      { url: '/uz/offline', matcher: ({ request }: { request: Request }) => request.destination === 'document' },
    ],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Static 3D vehicle wireframes & GLB assets -> CacheFirst (1 Year)
    {
      matcher: ({ url }) => url.pathname.startsWith('/models/') || url.pathname.endsWith('.glb'),
      handler: new CacheFirst({
        cacheName: 'carvision-3d-wireframes-v1',
        plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    // 2. Catalog & Item Reference Images (CDN) -> StaleWhileRevalidate (30 Days)
    {
      matcher: ({ url }) =>
        url.hostname === 'cdn.carvision.app' || url.pathname.startsWith('/catalog/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'carvision-catalog-thumbs-v1',
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // 3. UI Google Fonts & Static Fonts -> CacheFirst
    {
      matcher: ({ url }) =>
        url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com'),
      handler: new CacheFirst({
        cacheName: 'google-fonts-cache-v1',
      }),
    },
    // 3b. Product / banner photos in the public Supabase bucket: shown instantly (also offline) and
    //     refreshed in the background. Must come before the Supabase network-only rule below.
    {
      matcher: ({ url, request }) =>
        request.method === 'GET' && url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/storage/v1/object/public/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'carvision-storage-images-v1',
        plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // 4. API Endpoints, Supabase Auth, Webhooks & Realtime -> STRICTLY NetworkOnly
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('fal.run'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Push notifications (order approved / rejected, refund, new paid order, payout)
// ---------------------------------------------------------------------------
interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any;

sw.addEventListener('push', (event: { data?: { json(): PushPayload } | null; waitUntil(p: Promise<unknown>): void }) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    /* a payload we cannot read still shows a generic notification */
  }
  event.waitUntil(
    (async () => {
      await sw.registration.showNotification(data.title || 'CarVision', {
        body: data.body || '',
        icon: '/icons/icon-192.png?v=3',
        badge: '/icons/badge-96.png?v=3',
        tag: data.tag || 'carvision',
        data: { url: data.url || '/' },
      });
      // Red dot on the app icon while something new is waiting (Android / desktop / iOS 16.4+).
      try {
        await sw.navigator?.setAppBadge?.();
      } catch {
        /* not supported */
      }
    })()
  );
});

sw.addEventListener('notificationclick', (event: { notification: { close(): void; data?: { url?: string } }; waitUntil(p: Promise<unknown>): void }) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', sw.location.origin).href;
  event.waitUntil(
    (async () => {
      try {
        await sw.navigator?.clearAppBadge?.();
      } catch {
        /* not supported */
      }
      const windows = (await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })) as Array<{ url: string; focus(): Promise<unknown>; navigate?(u: string): Promise<unknown> }>;
      // Reuse the open app window instead of stacking a second one.
      const open = windows.find((w) => new URL(w.url).origin === sw.location.origin);
      if (open) {
        await open.focus();
        if (open.navigate) await open.navigate(target).catch(() => {});
        return;
      }
      await sw.clients.openWindow(target);
    })()
  );
});
