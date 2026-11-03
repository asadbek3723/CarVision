import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { loadItems } from '@/server/catalog';
import { CATALOG_CATEGORIES, veloceCategory } from '@/domain/catalog';

export const dynamic = 'force-dynamic';

/**
 * Public shop listing: published items only. Workshop identity stays masked
 * (anti-disintermediation): no phone, no address, no real shop name.
 */
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    const ids = params.get('ids')?.split(',').filter(Boolean);
    const query = params.get('query')?.trim() || undefined;
    const categoryParam = params.get('category');
    const limit = Math.min(parseInt(params.get('limit') || '60', 10) || 60, 200);
    const modelId = params.get('model');
    const year = parseInt(params.get('year') || '', 10) || null;
    const brandFilter = params.get('brand')?.trim().toLowerCase() || null;

    // Accept both catalog slugs and the shop's display categories (Wheels, Body Kit, ...)
    let category: string | undefined;
    if (categoryParam && categoryParam !== 'All') {
      category = CATALOG_CATEGORIES.find((c) => c.slug === categoryParam)?.slug;
    }

    const db = createAdminClient();
    let items = await loadItems(db, {
      statuses: ['PUBLISHED'],
      ids: id ? [id] : ids,
      category,
      query,
      limit: categoryParam && !category && categoryParam !== 'All' ? 200 : limit,
    });
    if (categoryParam && categoryParam !== 'All' && !category) {
      items = items.filter((i) => veloceCategory(i.category).toLowerCase() === categoryParam.toLowerCase()).slice(0, limit);
    }

    // "My car" filter: universal items plus items whose fitment names this model (and year, if given)
    if (modelId && /^[0-9a-f-]{36}$/i.test(modelId)) {
      items = items.filter(
        (i) =>
          i.isUniversal ||
          i.fitment.some(
            (f) =>
              f.modelId === modelId &&
              (!year || ((f.yearFrom === null || year >= f.yearFrom) && (f.yearTo === null || year <= f.yearTo)))
          )
      );
    }
    if (brandFilter) items = items.filter((i) => i.brand.toLowerCase() === brandFilter);

    const products = items.map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand || 'CarVision',
      price: i.priceUSD,
      spec: i.description,
      category: veloceCategory(i.category),
      categoryLabel: i.categoryLabel,
      image: i.coverImageUrl ?? i.images[0]?.url ?? '',
      image_url: i.coverImageUrl ?? i.images[0]?.url ?? '',
      images: i.images.map((g) => g.url),
      angleImage: i.images.find((g) => g.kind === 'ANGLE')?.url,
      swatch: typeof i.attributes['swatch'] === 'string' ? i.attributes['swatch'] : undefined,
      inStock: i.stock > 0,
      stock: i.stock,
      installAvailable: i.installAvailable,
      installPrice: i.installPriceUSD,
      attributes: i.attributes,
      targetCar: i.isUniversal ? 'Barcha mashinalar' : i.fitment[0]?.label ?? '',
      compatibility: i.isUniversal ? [] : i.fitment.map((f) => ({ id: f.modelId ?? f.id, name: f.label, yearFrom: f.yearFrom, yearTo: f.yearTo })),
      isUniversal: i.isUniversal,
      sellerName: `Verified Partner #${i.shopId.slice(0, 4).toUpperCase()}`,
      seller: { id: i.shopId, business_name: `Verified Partner #${i.shopId.slice(0, 4).toUpperCase()}` },
      createdAt: i.createdAt,
    }));

    // Facets for the filter UI (independent of the current filters)
    const { data: facetRows } = await db.from('catalog_items').select('brand, category').eq('status', 'PUBLISHED').limit(1000);
    const brands = [...new Set((facetRows ?? []).map((r) => (r.brand as string | null)?.trim()).filter((b): b is string => Boolean(b)))].sort((a, b) => a.localeCompare(b));
    const categories = [...new Set((facetRows ?? []).map((r) => veloceCategory(r.category as string)))];

    return NextResponse.json({ success: true, products, facets: { brands, categories } });
  } catch (err) {
    console.error('products list error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
