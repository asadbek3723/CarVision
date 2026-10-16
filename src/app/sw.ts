import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Static 3D vehicle wireframes & GLB assets -> CacheFirst (1 Year)
    {
      matcher: ({ url }) => url.pathname.startsWith('/models/') || url.pathname.endsWith('.glb'),
      handler: new CacheFirst({
        cacheName: 'carvision-3d-wireframes-v1',
      }),
    },
    // 2. Catalog & Item Reference Images (CDN) -> StaleWhileRevalidate (30 Days)
    {
      matcher: ({ url }) =>
        url.hostname === 'cdn.carvision.app' || url.pathname.startsWith('/catalog/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'carvision-catalog-thumbs-v1',
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
