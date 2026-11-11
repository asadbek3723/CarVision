import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { loadItems } from '@/server/catalog';
import type { CatalogItemDTO } from '@/domain/catalog';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One PUBLISHED catalog item for SEO (metadata, JSON-LD, OG image). Deduped per request via React cache. */
export const getPublishedItem = cache(async (id: string): Promise<CatalogItemDTO | null> => {
  if (!UUID.test(id)) return null;
  try {
    const [item] = await loadItems(createAdminClient(), { listedOnly: true, ids: [id], statuses: ['PUBLISHED'], limit: 1 });
    return item ?? null;
  } catch {
    return null;
  }
});
