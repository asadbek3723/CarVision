import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

const PRIVATE = ['admin', 'seller', 'cart', 'garage', 'profile', 'capture', 'scan', 'customize/result', 'offline', 'login', 'register'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', ...PRIVATE.map((p) => `/*/${p}`)],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
