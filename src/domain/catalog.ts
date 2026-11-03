/**
 * Catalog domain: categories, attributes and price helpers shared by the seller
 * studio, the public shop and the API.
 */
import { DEFAULT_RATES } from './currency';

export const CATALOG_CATEGORIES = [
  { slug: 'wheels', label: 'Disklar', hint: 'Disk, gildirak', veloce: 'Wheels' },
  { slug: 'body_kit', label: 'Bamper va obves', hint: 'Bamper, lip, porog, diffuzor', veloce: 'Body Kit' },
  { slug: 'lighting', label: 'Fara va optika', hint: 'Old va orqa chiroqlar', veloce: 'Performance' },
  { slug: 'spoiler', label: 'Spoyler', hint: 'Spoyler, qanot', veloce: 'Body Kit' },
  { slug: 'suspension', label: 'Podveska', hint: 'Prujina, amortizator, koilover', veloce: 'Suspension' },
  { slug: 'interior', label: 'Salon va rul', hint: "O'rindiq, rul, panel", veloce: 'Interior' },
  { slug: 'exhaust', label: 'Glushitel', hint: 'Chiqarish tizimi', veloce: 'Performance' },
  { slug: 'wrap_paint', label: 'Rang va plyonka', hint: 'Wrap, bo‘yoq, tonirovka', veloce: 'Color' },
  { slug: 'other', label: 'Boshqa', hint: 'Boshqa detallar', veloce: 'Performance' },
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]['slug'];
export const CATEGORY_SLUGS = CATALOG_CATEGORIES.map((c) => c.slug) as [CatalogCategory, ...CatalogCategory[]];

export function categoryLabel(slug: string): string {
  return CATALOG_CATEGORIES.find((c) => c.slug === slug)?.label ?? 'Boshqa';
}

export function veloceCategory(slug: string): string {
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
  createdAt: string;
}
