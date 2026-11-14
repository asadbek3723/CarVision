import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { CATALOG_CATEGORIES } from '@/domain/catalog';
import { categoryUrlSlug } from '@/lib/seo/categories';
import { absoluteUrl, languageAlternates, localePath } from '@/lib/seo/site';
import { itemImageUrls, listAllPublishedItems } from '@/server/catalog-seo';

export const revalidate = 600;

type Freq = 'daily' | 'weekly' | 'monthly';
type Entry = MetadataRoute.Sitemap[number];

/** Public, indexable pages (login/register/app screens are noindex and excluded). */
const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/catalog', priority: 0.9, changeFrequency: 'daily' },
  { path: '/plans', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
];

function perLocale(path: string, extra: Omit<Entry, 'url' | 'alternates'>): Entry[] {
  return routing.locales.map((locale) => ({
    url: absoluteUrl(localePath(locale, path)),
    ...extra,
    alternates: { languages: languageAlternates(path) },
  }));
}

/**
 * Every page, in every language, with hreflang alternates. Every published part gets its own URL
 * and its photos are listed with it (image sitemap), so they appear in Google Images too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const items = await listAllPublishedItems();
  const newest = items[0] ? new Date(items[0].createdAt) : now;

  const staticEntries = STATIC_PAGES.flatMap(({ path, priority, changeFrequency }) =>
    perLocale(path, { lastModified: path === '/catalog' || path === '/shop' ? newest : now, changeFrequency, priority })
  );

  const categoryEntries = CATALOG_CATEGORIES.flatMap((c) => {
    const inCategory = items.filter((i) => i.category === c.slug);
    const first = inCategory[0];
    if (!first) return []; // empty category pages are noindex
    return perLocale(`/catalog/${categoryUrlSlug(c.slug)}`, {
      lastModified: new Date(first.createdAt),
      changeFrequency: 'daily',
      priority: 0.8,
    });
  });

  const productEntries = items.flatMap((item) => {
    const images = itemImageUrls(item, 5);
    return perLocale(`/shop/${item.id}`, {
      lastModified: new Date(item.createdAt),
      changeFrequency: 'weekly',
      priority: 0.7,
      ...(images.length ? { images } : {}),
    });
  });

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
