import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaidSeller } from '@/server/auth/guards';
import { getServerRates } from '@/server/rates';
import { coverFor, itemBodySchema, loadItems, replaceItemRelations } from '@/server/catalog';
import { toUsdCents, veloceCategory, type CatalogItemDTO } from '@/domain/catalog';

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, error, ...extra }, { status });

/** Shape the studio / customize screens already understand (VeloceProduct). */
function toVeloceProduct(i: CatalogItemDTO) {
  return {
    id: i.id,
    name: i.name,
    brand: i.brand || 'CarVision',
    price: i.priceUSD,
    priceUSD: i.priceUSD,
    spec: i.description,
    category: veloceCategory(i.category),
    image: i.coverImageUrl ?? i.images[0]?.url ?? '',
    angleImage: i.images.find((g) => g.kind === 'ANGLE')?.url,
    swatch: typeof i.attributes['swatch'] === 'string' ? (i.attributes['swatch'] as string) : undefined,
    stock: i.stock,
    inStock: i.stock > 0,
    rating: 5,
    status: i.status,
    targetCar: i.fitment[0]?.label,
    compatibility: i.fitment.map((f) => ({ id: f.modelId ?? f.id, name: f.label })),
  };
}

/** The signed-in workshop's own items (all statuses except archived). */
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const id = new URL(request.url).searchParams.get('id');

    const items = await loadItems(createAdminClient(), {
      shopId: guard.value.shopId,
      statuses: ['DRAFT', 'PUBLISHED'],
      ids: id ? [id] : undefined,
      limit: 200,
    });

    return NextResponse.json({
      success: true,
      seller: { id: guard.value.shopId, business_name: guard.value.session.shop?.shop_name ?? '' },
      items,
      products: items.filter((i) => i.status === 'PUBLISHED').map(toVeloceProduct),
      totalCount: items.length,
      inStockCount: items.filter((i) => i.stock > 0 && i.status === 'PUBLISHED').length,
    });
  } catch (err) {
    console.error('inventory GET error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

/** Creates an item. It is published immediately unless `publish: false` (draft). */
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;

    const parsed = itemBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message ?? 'Ma’lumotlar noto‘g‘ri', { details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const db = createAdminClient();
    const shopId = guard.value.shopId;
    const rates = await getServerRates();

    const { count } = await db.from('catalog_items').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).neq('status', 'ARCHIVED');
    const { data: plan } = await db.from('pricing_plans').select('max_custom_items').eq('code', guard.value.session.shop?.current_plan_code ?? 'FREE_TRIAL').maybeSingle();
    const limit = (plan?.max_custom_items as number | undefined) ?? 10;
    if ((count ?? 0) >= limit) {
      return fail(402, `Tarifingizda ${limit} tagacha mahsulot qo‘shish mumkin. Tarifni yangilang`, { code: 'ITEM_LIMIT', limit });
    }

    const { data: created, error } = await db
      .from('catalog_items')
      .insert({
        shop_id: shopId,
        category: body.category,
        name: body.name,
        brand: body.brand || null,
        description: body.description || null,
        price_cents: toUsdCents(body.price, body.currency, rates),
        input_currency: body.currency,
        input_price: body.price,
        stock: body.stock,
        install_available: body.installAvailable,
        install_price_cents: toUsdCents(body.installPrice ?? 0, body.currency, rates),
        attributes: body.attributes,
        status: body.publish ? 'PUBLISHED' : 'DRAFT',
        cover_image_url: coverFor(body),
        published_at: body.publish ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error || !created) {
      console.error('catalog insert failed:', error?.message);
      return fail(500, 'Mahsulotni saqlab bo‘lmadi');
    }

    const relErr = await replaceItemRelations(db, created.id as string, shopId, body);
    if (relErr) {
      await db.from('catalog_items').delete().eq('id', created.id);
      return fail(400, relErr);
    }

    const [item] = await loadItems(db, { shopId, ids: [created.id as string], limit: 1 });
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err) {
    console.error('inventory POST error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

const quickSchema = z
  .object({
    id: z.string().uuid(),
    stock: z.number().int().min(0).max(100_000).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  })
  .strict();

/** Full edit (`name` present) or a quick update of stock / visibility. */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const shopId = guard.value.shopId;
    const db = createAdminClient();
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw || typeof raw['id'] !== 'string') return fail(400, 'id kerak');

    if (!('name' in raw)) {
      const quick = quickSchema.safeParse(raw);
      if (!quick.success) return fail(400, 'Ma’lumotlar noto‘g‘ri');
      const updates: Record<string, unknown> = {};
      if (quick.data.stock !== undefined) updates['stock'] = quick.data.stock;
      if (quick.data.status) {
        updates['status'] = quick.data.status;
        if (quick.data.status === 'PUBLISHED') updates['published_at'] = new Date().toISOString();
      }
      if (Object.keys(updates).length === 0) return fail(400, 'O‘zgarish yo‘q');
      const { data, error } = await db
        .from('catalog_items')
        .update(updates)
        .eq('id', quick.data.id)
        .eq('shop_id', shopId)
        .neq('status', 'ARCHIVED')
        .select('id')
        .maybeSingle();
      if (error || !data) return fail(404, 'Mahsulot topilmadi');
      return NextResponse.json({ success: true });
    }

    const { id, ...rest } = raw;
    const parsed = itemBodySchema.safeParse(rest);
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message ?? 'Ma’lumotlar noto‘g‘ri', { details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const rates = await getServerRates();

    const { data: existing } = await db.from('catalog_items').select('id, status').eq('id', id as string).eq('shop_id', shopId).maybeSingle();
    if (!existing || existing.status === 'ARCHIVED') return fail(404, 'Mahsulot topilmadi');

    const { error } = await db
      .from('catalog_items')
      .update({
        category: body.category,
        name: body.name,
        brand: body.brand || null,
        description: body.description || null,
        price_cents: toUsdCents(body.price, body.currency, rates),
        input_currency: body.currency,
        input_price: body.price,
        stock: body.stock,
        install_available: body.installAvailable,
        install_price_cents: toUsdCents(body.installPrice ?? 0, body.currency, rates),
        attributes: body.attributes,
        status: body.publish ? 'PUBLISHED' : 'DRAFT',
        cover_image_url: coverFor(body),
        published_at: body.publish ? new Date().toISOString() : null,
      })
      .eq('id', id as string)
      .eq('shop_id', shopId);
    if (error) return fail(500, 'Mahsulotni saqlab bo‘lmadi');

    const relErr = await replaceItemRelations(db, id as string, shopId, body);
    if (relErr) return fail(400, relErr);

    const [item] = await loadItems(db, { shopId, ids: [id as string], limit: 1 });
    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error('inventory PATCH error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}

/** Soft delete: the item disappears from the shop but order history stays intact. */
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePaidSeller();
    if (!guard.ok) return guard.response;
    const id = new URL(request.url).searchParams.get('productId') ?? new URL(request.url).searchParams.get('id');
    if (!id || !z.string().uuid().safeParse(id).success) return fail(400, 'id kerak');

    const { data, error } = await createAdminClient()
      .from('catalog_items')
      .update({ status: 'ARCHIVED' })
      .eq('id', id)
      .eq('shop_id', guard.value.shopId)
      .select('id')
      .maybeSingle();
    if (error || !data) return fail(404, 'Mahsulot topilmadi');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('inventory DELETE error:', err);
    return fail(500, 'Serverda xatolik yuz berdi');
  }
}
