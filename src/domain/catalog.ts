/**
 * Catalog domain: categories, attributes and price helpers shared by the seller
 * studio, the public shop and the API.
 */
import { DEFAULT_RATES } from './currency';

export const CATALOG_CATEGORIES = [
  { slug: 'wheels', label: 'Disklar', hint: 'Disk, gildirak', veloce: 'Wheels' },
  { slug: 'body_kit', label: 'Bamper va obves', hint: 'Bamper, lip, porog, diffuzor', veloce: 'Body Kit' },
  { slug: 'lighting', label: 'Fara va optika', hint: 'Old va orqa chiroqlar', veloce: 'Lights' },
  { slug: 'spoiler', label: 'Spoyler', hint: 'Spoyler, qanot', veloce: 'Spoiler' },
  { slug: 'suspension', label: 'Podveska', hint: 'Prujina, amortizator, koilover', veloce: 'Suspension' },
  { slug: 'interior', label: 'Salon va rul', hint: "O'rindiq, rul, panel", veloce: 'Interior' },
  { slug: 'exhaust', label: 'Glushitel', hint: 'Chiqarish tizimi', veloce: 'Performance' },
  { slug: 'wrap_paint', label: 'Rang va plyonka', hint: 'Wrap, bo‘yoq, tonirovka', veloce: 'Color' },
  { slug: 'ceramic', label: 'Keramika', hint: 'Keramik qoplama', veloce: 'Ceramic' },
  { slug: 'polish', label: 'Polirovka', hint: 'Kuzov polirovkasi', veloce: 'Polish' },
  { slug: 'other', label: 'Boshqa', hint: 'Boshqa detallar', veloce: 'Performance' },
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]['slug'];
export const CATEGORY_SLUGS = CATALOG_CATEGORIES.map((c) => c.slug) as [CatalogCategory, ...CatalogCategory[]];

export function categoryLabel(slug: string): string {
  return CATALOG_CATEGORIES.find((c) => c.slug === slug)?.label ?? 'Boshqa';
}

/**
 * Shop / studio category of an item. Bumpers are stored as `body_kit` with `attributes.slot =
 * 'bumper'`, so a car can wear a bumper and a full body kit (or a spoiler) at the same time.
 */
export function veloceCategory(slug: string, attributes?: Record<string, unknown> | null): string {
  if (slug === 'body_kit' && attributes?.['slot'] === 'bumper') return 'Bumper';
  return CATALOG_CATEGORIES.find((c) => c.slug === slug)?.veloce ?? 'Performance';
}

export const PRICE_CURRENCIES = ['USD', 'UZS', 'AED', 'TRY', 'KZT', 'KGS', 'TJS', 'RUB'] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

export const MAX_ITEM_IMAGES = 5;

/** Converts an amount in `currency` to integer USD cents (prices are stored in USD cents). */
export function toUsdCents(amount: number, currency: string, rates: Record<string, number | undefined> = DEFAULT_RATES): number {
  const rate = rates[currency.toUpperCase()] || DEFAULT_RATES[currency.toUpperCase()] || 1;
  return Math.max(0, Math.round((amount / rate) * 100));
}

export function centsToUsd(cents: number): number {
  return Math.round(cents) / 100;
}

export interface ItemImageDTO {
  id: string;
  url: string;
  kind: 'ORIGINAL' | 'STUDIO' | 'ANGLE';
}

export interface ItemFitmentDTO {
  id: string;
  modelId: string | null;
  customModel: string | null;
  label: string;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface CatalogItemDTO {
  id: string;
  shopId: string;
  name: string;
  brand: string;
  description: string;
  category: CatalogCategory;
  categoryLabel: string;
  priceUSD: number;
  inputPrice: number | null;
  inputCurrency: string;
  stock: number;
  installAvailable: boolean;
  installPriceUSD: number;
  attributes: Record<string, unknown>;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  coverImageUrl: string | null;
  images: ItemImageDTO[];
  fitment: ItemFitmentDTO[];
  isUniversal: boolean;
  /** Language the seller wrote `name` / `description` in (null until detected). */
  sourceLang: string | null;
  translations: ItemTranslations;
  createdAt: string;
}

/** Languages the storefront supports (same list as the router). */
export const ITEM_LOCALES = ['uz', 'ru', 'en', 'ar', 'tr', 'kk', 'ky', 'tg'] as const;
export type ItemLocale = (typeof ITEM_LOCALES)[number];

export interface ItemTranslation {
  name?: string | undefined;
  description?: string | undefined;
  /** The seller edited this language by hand: automatic translation must not overwrite it. */
  manual?: boolean | undefined;
}

export type ItemTranslations = Partial<Record<ItemLocale, ItemTranslation>>;

/** Name and description in `locale`: the translation when there is one, otherwise what the seller typed. */
export function localizedText(
  item: { name: string; description: string; translations?: ItemTranslations | undefined; sourceLang?: string | null | undefined },
  locale: string
): { name: string; description: string } {
  if (!locale || locale === item.sourceLang) return { name: item.name, description: item.description };
  const tr = item.translations?.[locale as ItemLocale];
  return { name: tr?.name?.trim() || item.name, description: tr?.description?.trim() || item.description };
}
