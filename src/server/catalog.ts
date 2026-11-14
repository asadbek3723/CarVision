import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { MIN_CAR_YEAR, maxCarYear } from '@/domain/car-fit';
import {
  CATEGORY_SLUGS,
  ITEM_LOCALES,
  type ItemTranslations,
  MAX_ITEM_IMAGES,
  PRICE_CURRENCIES,
  categoryLabel,
  centsToUsd,
  type CatalogCategory,
  type CatalogItemDTO,
} from '@/domain/catalog';

type Db = ReturnType<typeof createAdminClient>;

export const CATALOG_BUCKET = 'catalog';

/** Public URL prefix every image of a shop must start with (prevents hot-linking arbitrary hosts). */
export function shopImagePrefix(shopId: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${CATALOG_BUCKET}/${shopId}/`;
}

/**
 * True when `raw` is a file in this shop's own folder. A plain prefix test would accept
 * `<prefix>../other-shop/x.jpg` (or its %2e%2e spelling), which points at someone else's file.
 */
export function isOwnShopImage(raw: string, shopId: string): boolean {
  const prefix = shopImagePrefix(shopId);
  if (!raw.startsWith(prefix)) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.slice(prefix.length));
  } catch {
    return false;
  }
  if (!decoded || decoded.includes('..') || decoded.includes('\\') || /[?#]/.test(raw)) return false;
  try {
    return new URL(raw).href.startsWith(prefix);
  } catch {
    return false;
  }
}

const attributesSchema = z
  .object({
    diameter: z.number().int().min(10).max(30).optional(),
    width: z.number().min(3).max(15).optional(),
    pcd: z.string().trim().max(20).optional(),
    offset: z.number().int().min(-60).max(100).optional(),
    swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    material: z.string().trim().max(60).optional(),
    color: z.string().trim().max(60).optional(),
    universal: z.boolean().optional(),
    /** `bumper` marks a body_kit item as a bumper (its own slot in the studio). */
    slot: z.enum(['bumper']).optional(),
  })
  .strict();

const fitmentSchema = z
  .object({
    modelId: z.string().uuid().optional(),
    customModel: z.string().trim().min(2).max(120).optional(),
    yearFrom: z.number().int().min(MIN_CAR_YEAR).optional(),
    yearTo: z.number().int().min(MIN_CAR_YEAR).optional(),
  })
  .refine((f) => Boolean(f.modelId || f.customModel), 'modelId yoki customModel kerak')
  // Checked per request (not fixed when the module loads), so the limit follows the calendar.
  .refine((f) => (f.yearFrom ?? 0) <= maxCarYear() && (f.yearTo ?? 0) <= maxCarYear(), 'Yil joriy yildan katta bo‘lishi mumkin emas')
  .refine((f) => !f.yearFrom || !f.yearTo || f.yearFrom <= f.yearTo, 'Yil oralig‘i noto‘g‘ri');

export const itemBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Nomini kiriting').max(150),
    brand: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1500).optional(),
    category: z.enum(CATEGORY_SLUGS),
    price: z.number().positive('Narx 0 dan katta bo‘lishi kerak').max(1_000_000_000),
    currency: z.enum(PRICE_CURRENCIES).default('USD'),
    stock: z.number().int().min(0).max(100_000).default(1),
    installAvailable: z.boolean().default(true),
    installPrice: z.number().min(0).max(1_000_000_000).optional(),
    attributes: attributesSchema.default({}),
    images: z
      .array(z.object({ url: z.string().url(), kind: z.enum(['ORIGINAL', 'STUDIO', 'ANGLE']).default('ORIGINAL') }))
      .min(1, 'Kamida 1 ta rasm kerak')
      .max(MAX_ITEM_IMAGES),
    fitment: z.array(fitmentSchema).max(60).default([]),
    publish: z.boolean().default(true),
    /** Hand-edited translations (only the languages the seller changed). */
    translations: z
      .record(z.enum(ITEM_LOCALES), z.object({ name: z.string().trim().max(150).optional(), description: z.string().trim().max(1500).optional() }))
      .optional(),
  })
  .strict()
  .refine((b) => b.attributes.universal === true || b.fitment.length > 0, {
    message: 'Kamida 1 ta mashinani tanlang yoki "Barcha mashinalarga" ni belgilang',
    path: ['fitment'],
  });

export type ItemBody = z.infer<typeof itemBodySchema>;

interface ItemRow {
  id: string;
  shop_id: string;
  category: string;
  name: string;
  brand: string | null;
  description: string | null;
  price_cents: number;
  input_currency: string;
  input_price: number | null;
  stock: number;
  install_available: boolean;
  install_price_cents: number;
  attributes: Record<string, unknown> | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  cover_image_url: string | null;
  created_at: string;
}

export interface LoadItemsOptions {
  /** Public pages: only items of verified workshops whose owner is not banned. */
  listedOnly?: boolean | undefined;
  shopId?: string | undefined;
  ids?: string[] | undefined;
  statuses?: Array<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'> | undefined;
  category?: string | undefined;
  query?: string | undefined;
  limit?: number | undefined;
  /** Rows to skip (newest first), for paging through the whole catalog (sitemap, catalog pages). */
  offset?: number | undefined;
  /**
   * "My car": only universal items and items whose fitment names this model (and year). Applied in
   * the query, before the limit, so a large catalog never cuts off parts that fit.
   */
  fitModelId?: string | undefined;
  fitYear?: number | null | undefined;
}

/** Ids of items listed for a model (and year, when given). */
async function fittingItemIds(db: Db, modelId: string, year: number | null | undefined): Promise<string[]> {
  const { data, error } = await db.from('catalog_item_fitment').select('item_id, year_from, year_to').eq('model_id', modelId).limit(5000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ item_id: string; year_from: number | null; year_to: number | null }>;
  return [
    ...new Set(
      rows
        .filter((r) => !year || ((r.year_from === null || year >= r.year_from) && (r.year_to === null || year <= r.year_to)))
        .map((r) => r.item_id)
    ),
  ];
}

/** Loads items with their images and fitment (labels resolved from the vehicle database). */
/** Public listing source: the view hides unverified workshops and banned owners. */
export const LISTED_ITEMS = 'catalog_items_listed';

/** PostgREST / Postgres answer for a table or view that does not exist (yet). */
export function isMissingRelation(error: { code?: string | undefined; message?: string | undefined }): boolean {
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message ?? '');
}

export async function loadItems(db: Db, opts: LoadItemsOptions): Promise<CatalogItemDTO[]> {
  const fitIds = opts.fitModelId ? await fittingItemIds(db, opts.fitModelId, opts.fitYear) : null;
  const run = (table: string) => {
    let q = db
      .from(table)
      .select(
        'id, shop_id, category, name, brand, description, price_cents, input_currency, input_price, stock, install_available, install_price_cents, attributes, status, cover_image_url, created_at'
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });
    const size = Math.min(opts.limit ?? 100, 200);
    q = opts.offset ? q.range(opts.offset, opts.offset + size - 1) : q.limit(size);

    if (opts.shopId) q = q.eq('shop_id', opts.shopId);
    if (opts.ids?.length) q = q.in('id', opts.ids);
    if (opts.statuses?.length) q = q.in('status', opts.statuses);
    if (opts.category) q = q.eq('category', opts.category);
    if (fitIds) {
      q = fitIds.length ? q.or(`id.in.(${fitIds.join(',')}),attributes->>universal.eq.true`) : q.eq('attributes->>universal', 'true');
    }
    if (opts.query) {
      const safe = opts.query.replace(/[%,()]/g, ' ').trim();
      if (safe) q = q.or(`name.ilike.%${safe}%,brand.ilike.%${safe}%`);
    }
    return q;
  };

  let { data: rows, error } = await run(opts.listedOnly ? LISTED_ITEMS : 'catalog_items');
  if (error && opts.listedOnly && isMissingRelation(error)) {
    // The 20261120 migration is not applied yet: keep the shop working (purchases are still checked
    // by the database once it is), and say so loudly.
    console.error(`${LISTED_ITEMS} view missing: apply supabase/migrations/20261120000000_security_hardening.sql`);
    ({ data: rows, error } = await run('catalog_items'));
  }
  if (error) throw new Error(error.message);
  const items = (rows ?? []) as ItemRow[];
  if (items.length === 0) return [];

  const ids = items.map((i) => i.id);
  // One round trip for everything that only needs the item ids.
  // Translations live in columns added by a later migration: read them separately so the catalog keeps working without it.
  const [{ data: imgs }, { data: fits }, { data: trRows, error: trErr }] = await Promise.all([
    db.from('catalog_item_images').select('id, item_id, url, kind, position').in('item_id', ids).order('position'),
    db.from('catalog_item_fitment').select('id, item_id, model_id, custom_model, year_from, year_to').in('item_id', ids),
    db.from('catalog_items').select('id, source_lang, translations').in('id', ids),
  ]);

  const modelIds = [...new Set((fits ?? []).map((f) => f.model_id as string | null).filter((v): v is string => Boolean(v)))];
  const modelLabel = new Map<string, string>();
  if (modelIds.length) {
    const { data: models } = await db.from('vehicle_models').select('id, name, make_id').in('id', modelIds);
    const makeIds = [...new Set((models ?? []).map((m) => m.make_id as string))];
    const { data: makes } = makeIds.length
      ? await db.from('vehicle_makes').select('id, name').in('id', makeIds)
      : { data: [] as Array<{ id: string; name: string }> };
    const makeName = new Map((makes ?? []).map((m) => [m.id as string, m.name as string]));
    for (const m of models ?? []) {
      modelLabel.set(m.id as string, `${makeName.get(m.make_id as string) ?? ''} ${m.name as string}`.trim());
    }
  }

  const translated = new Map<string, { sourceLang: string | null; translations: ItemTranslations }>();
  if (!trErr) {
    for (const r of trRows ?? []) {
      translated.set(r.id as string, { sourceLang: (r.source_lang as string | null) ?? null, translations: ((r.translations as ItemTranslations | null) ?? {}) });
    }
  }

  return items.map((i) => {
    const attrs = (i.attributes ?? {}) as Record<string, unknown>;
    return {
      id: i.id,
      shopId: i.shop_id,
      name: i.name,
      brand: i.brand ?? '',
      description: i.description ?? '',
      category: i.category as CatalogCategory,
      categoryLabel: categoryLabel(i.category),
      priceUSD: centsToUsd(i.price_cents),
      inputPrice: i.input_price,
      inputCurrency: i.input_currency,
      stock: i.stock,
      installAvailable: i.install_available,
      installPriceUSD: centsToUsd(i.install_price_cents),
      attributes: attrs,
      status: i.status,
      coverImageUrl: i.cover_image_url,
      images: (imgs ?? [])
        .filter((g) => g.item_id === i.id)
        .map((g) => ({ id: g.id as string, url: g.url as string, kind: g.kind as 'ORIGINAL' | 'STUDIO' | 'ANGLE' })),
      fitment: (fits ?? [])
        .filter((f) => f.item_id === i.id)
        .map((f) => ({
          id: f.id as string,
          modelId: (f.model_id as string | null) ?? null,
          customModel: (f.custom_model as string | null) ?? null,
          label: f.model_id ? modelLabel.get(f.model_id as string) ?? 'Noma’lum model' : (f.custom_model as string),
          yearFrom: (f.year_from as number | null) ?? null,
          yearTo: (f.year_to as number | null) ?? null,
        })),
      isUniversal: attrs['universal'] === true,
      sourceLang: translated.get(i.id)?.sourceLang ?? null,
      translations: translated.get(i.id)?.translations ?? {},
      createdAt: i.created_at,
    };
  });
}

/** Writes images + fitment of an item (full replace). Returns an error string or null. */
export async function replaceItemRelations(db: Db, itemId: string, shopId: string, body: ItemBody): Promise<string | null> {
  if (body.images.some((img) => !isOwnShopImage(img.url, shopId))) {
    return 'Rasm manzili noto‘g‘ri. Rasmlarni qayta yuklang';
  }

  const modelIds = [...new Set(body.fitment.map((f) => f.modelId).filter((v): v is string => Boolean(v)))];
  if (modelIds.length) {
    const { data: found } = await db.from('vehicle_models').select('id').in('id', modelIds);
    if ((found ?? []).length !== modelIds.length) return 'Tanlangan mashina bazada topilmadi';
  }

  const { error: delImgErr } = await db.from('catalog_item_images').delete().eq('item_id', itemId);
  const { error: delFitErr } = await db.from('catalog_item_fitment').delete().eq('item_id', itemId);
  if (delImgErr || delFitErr) return 'Saqlashda xatolik';

  const { error: imgErr } = await db
    .from('catalog_item_images')
    .insert(body.images.map((img, position) => ({ item_id: itemId, url: img.url, kind: img.kind, position })));
  if (imgErr) return 'Rasmlarni saqlashda xatolik';

  if (body.fitment.length) {
    const { error: fitErr } = await db.from('catalog_item_fitment').insert(
      body.fitment.map((f) => ({
        item_id: itemId,
        model_id: f.modelId ?? null,
        custom_model: f.modelId ? null : f.customModel ?? null,
        year_from: f.yearFrom ?? null,
        year_to: f.yearTo ?? null,
      }))
    );
    if (fitErr) return 'Mashina moslikni saqlashda xatolik';
  }
  return null;
}

export function coverFor(body: ItemBody): string {
  return (body.images.find((i) => i.kind === 'STUDIO') ?? body.images[0]!).url;
}
