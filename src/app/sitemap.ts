import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { absoluteUrl, languageAlternates, localePath } from '@/lib/seo/site';
import { createAdminClient } from '@/lib/supabase/server';
import { loadItems } from '@/server/catalog';

export const revalidate = 3600;

/** Public, indexable pages (login/register/app screens are noindex and excluded). */
const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }> = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/plans', priority: 0.6, changeFrequency: 'monthly' },
];

async function productEntries(): Promise<Array<{ id: string; lastModified: Date; images: string[] }>> {
  try {
    const items = await loadItems(createAdminClient(), { statuses: ['PUBLISHED'], limit: 200 });
    return items.map((i) => ({
      id: i.id,
      lastModified: new Date(i.createdAt),
      // Image search: the part's photos are listed with its page.
      images: (i.images ?? []).map((img) => img.url).filter((u) => u.startsWith('https://')).slice(0, 5),
    }));
  } catch {
    // DB unavailable at build time: ship the static part of the sitemap anyway.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries = STATIC_PAGES.flatMap(({ path, priority, changeFrequency }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(localePath(locale, path)),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: languageAlternates(path) },
    }))
  );

  const products = await productEntries();
  const productEntriesAll = products.flatMap(({ id, lastModified, images }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(localePath(locale, `/shop/${id}`)),
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      ...(images.length ? { images } : {}),
      alternates: { languages: languageAlternates(`/shop/${id}`) },
    }))
  );

  return [...staticEntries, ...productEntriesAll];
}
