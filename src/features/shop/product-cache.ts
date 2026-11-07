import type { VeloceProduct } from '@/domain/veloce-catalog';

/**
 * Every part the shop has already shown, kept for the life of the tab and keyed by locale + id.
 * Lists (shop, home, related) fill it; a part's page reads it first, so tapping a card shows the
 * part at once — even on a slow connection — and only refreshes it quietly in the background.
 */
const byId = new Map<string, VeloceProduct>();
const key = (locale: string, id: string) => `${locale}:${id}`;

export function rememberProducts(locale: string, products: readonly VeloceProduct[]): void {
  for (const p of products) byId.set(key(locale, p.id), p);
}

export function cachedProduct(locale: string, id: string): VeloceProduct | null {
  return byId.get(key(locale, id)) ?? null;
}

/** A few other parts already in memory, for "related" before the network answers. */
export function cachedOthers(locale: string, exceptId: string, count: number): VeloceProduct[] {
  const out: VeloceProduct[] = [];
  const prefix = `${locale}:`;
  for (const [k, p] of byId) {
    if (out.length >= count) break;
    if (k.startsWith(prefix) && p.id !== exceptId) out.push(p);
  }
  return out;
}

/** Start downloading a part's main photo the moment a finger touches its card. */
export function warmImage(src: string | undefined): void {
  if (!src || typeof window === 'undefined') return;
  const img = new window.Image();
  img.decoding = 'async';
  img.src = src;
}
