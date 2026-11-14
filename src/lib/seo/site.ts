import { locales, type Locale } from '@/i18n/routing';

export const SITE_NAME = 'CarVision';
export const DEFAULT_LOCALE: Locale = 'uz';

/** Absolute site origin (no trailing slash). Change only NEXT_PUBLIC_SITE_URL when a custom domain is attached. */
function resolveSiteUrl(): string {
  const explicit = process.env['NEXT_PUBLIC_SITE_URL'];
  if (explicit) return explicit;
  if (process.env.NODE_ENV !== 'production') return process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  return vercel ? `https://${vercel}` : 'https://car-vision-omega.vercel.app';
}

export const SITE_URL = resolveSiteUrl().replace(/\/+$/, '');

/**
 * Bump when the link-preview design changes: Telegram, WhatsApp and Facebook cache previews by image URL,
 * so a new query string makes them fetch the new picture.
 */
export const OG_IMAGE_VERSION = '3';

/** The brand link-preview image for a locale (rendered by app/[locale]/opengraph-image.tsx). */
export function brandOgImagePath(locale: Locale): string {
  return `/${locale}/opengraph-image?v=${OG_IMAGE_VERSION}`;
}

export const OG_LOCALE: Record<Locale, string> = {
  uz: 'uz_UZ',
  ru: 'ru_RU',
  en: 'en_US',
  ar: 'ar_AR',
  tr: 'tr_TR',
  kk: 'kk_KZ',
  ky: 'ky_KG',
  tg: 'tg_TJ',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Builds `/{locale}{path}` (path starts with `/` or is empty). */
export function localePath(locale: Locale, path = ''): string {
  const p = path === '/' ? '' : path;
  return `/${locale}${p}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** hreflang map for every locale + x-default (uz). */
export function languageAlternates(path = ''): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of locales) map[l] = absoluteUrl(localePath(l, path));
  map['x-default'] = absoluteUrl(localePath(DEFAULT_LOCALE, path));
  return map;
}
