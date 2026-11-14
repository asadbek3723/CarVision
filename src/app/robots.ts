import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

const PRIVATE = ['admin', 'seller', 'cart', 'garage', 'profile', 'capture', 'scan', 'customize/result', 'offline', 'login', 'register'];
const DISALLOW = ['/api/', ...PRIVATE.map((p) => `/*/${p}`)];

/**
 * Search engines and AI assistants (ChatGPT, Claude, Perplexity, Gemini, Copilot...) are named
 * explicitly and allowed the public pages, so they can read the catalog and answer "where can I buy X".
 */
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Googlebot-Image',
  'Google-Extended',
  'Bingbot',
  'YandexBot',
  'YandexImages',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Applebot-Extended',
  'DuckDuckBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_BOTS, allow: ['/', '/llms.txt', '/favicon.ico', '/icons/'], disallow: DISALLOW },
      { userAgent: '*', allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
