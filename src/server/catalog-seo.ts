import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { loadItems } from '@/server/catalog';
import type { CatalogItemDTO } from '@/domain/catalog';

/** Hard ceiling so a runaway catalog can never make the sitemap or llms.txt time out. */
const MAX_ITEMS = 5000;
const PAGE = 200;

/**
 * Every published, listed part (newest first), paged through the database 200 at a time.
 * Used by the sitemap, the crawlable catalog pages and llms.txt, so every part a workshop uploads
 * gets its own indexable URL. Deduped per request; an unreachable database yields an empty list.
 */
export const listAllPublishedItems = cache(async (): Promise<CatalogItemDTO[]> => {
  const db = createAdminClient();
  const all: CatalogItemDTO[] = [];
  try {
    for (let offset = 0; offset < MAX_ITEMS; offset += PAGE) {
      const page = await loadItems(db, { listedOnly: true, statuses: ['PUBLISHED'], limit: PAGE, offset });
      all.push(...page);
      if (page.length < PAGE) break;
    }
  } catch {
    // Build time without a database, or a transient error: ship what we have.
  }
  return all;
});

/** Public photo URLs of an item, cover first, duplicates and non-https removed. */
export function itemImageUrls(item: CatalogItemDTO, max = 5): string[] {
  const urls = [item.coverImageUrl, ...item.images.map((i) => i.url)].filter(
    (u): u is string => typeof u === 'string' && u.startsWith('https://')
  );
  return [...new Set(urls)].slice(0, max);
}

/** Car models a part is listed for, e.g. ["Chevrolet Cobalt", "Chevrolet Gentra"]. */
export function itemFitLabels(item: CatalogItemDTO, max = 12): string[] {
  return [...new Set(item.fitment.map((f) => f.label).filter(Boolean))].slice(0, max);
}
