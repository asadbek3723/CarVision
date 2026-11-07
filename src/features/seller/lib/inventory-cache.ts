import type { CatalogItemDTO } from '@/domain/catalog';

/**
 * The signed-in seller's inventory, kept for the life of the tab. The garage and the dashboard
 * paint it at once when reopened and refresh it in the background. Keyed by user id, so another
 * account signing in on the same tab never sees it.
 */
let cache: { userId: string; items: CatalogItemDTO[] } | null = null;

export function cachedInventory(userId: string | undefined): CatalogItemDTO[] | null {
  return userId && cache?.userId === userId ? cache.items : null;
}

export function rememberInventory(userId: string | undefined, items: CatalogItemDTO[]): void {
  if (userId) cache = { userId, items };
}
