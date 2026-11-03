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

    return NextResponse.json({ success: true, products });
  } catch (err) {
    console.error('products list error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
