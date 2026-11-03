import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { convertToUSD, SupportedCurrency } from '@/domain/currency';

const addPartSchema = z.object({
  name: z.string().min(2, 'Mahsulot nomini kiriting').max(150),
  categoryId: z.string().min(1, 'Kategoriyani tanlang'),
  brand: z.string().min(1, 'Brend nomini kiriting').max(100),
  price: z.number().positive('Narx 0 dan katta bo‘lishi kerak'),
  currency: z
    .enum(['USD', 'UZS', 'AED', 'TRY', 'KZT', 'KGS', 'TJS', 'RUB'])
    .default('USD'),
  stock: z.number().int().nonnegative('Qoldiq sonini kiriting').default(1),
  compatibility: z.array(z.string()).min(1, 'Kamida 1 ta avtomobil modelini tanlang'),
  spec: z.string().optional(),
  imageUrl: z.string().min(5, 'Rasmni yuklang'),
  installationAvailable: z.boolean().default(true),
  installationPrice: z.number().nonnegative().optional(),
  sellerId: z.string().uuid().optional(),
});

const bulkImportSchema = z.object({
  sellerId: z.string().uuid().optional(),
  bulkItems: z
    .array(
      z.object({
        name: z.string().min(2),
        brand: z.string().default('OEM / Custom'),
        category: z.string().optional(),
        priceUSD: z.number().positive(),
        stock: z.number().int().positive().default(5),
        imageUrl: z.string().min(5),
        spec: z.string().optional(),
        compatibility: z.array(z.string()).optional(),
      })
    )
    .min(1),
});

async function resolveSellerAndCategories(supabase: ReturnType<typeof createAdminClient>, sellerId?: string | null) {
  let resolvedSellerId = sellerId || undefined;
  let sellerInfo: { id: string; business_name: string; address?: string | null; phone?: string | null; credits?: number | null } | null = null;

  if (resolvedSellerId) {
    const { data } = await supabase
      .from('sellers')
      .select('id, business_name, address, phone, credits')
      .eq('id', resolvedSellerId)
      .maybeSingle();
    if (data) sellerInfo = data;
  }

  if (!sellerInfo) {
    const { data: defaultSeller } = await supabase
      .from('sellers')
      .select('id, business_name, address, phone, credits')
      .order('verified', { ascending: false })
      .limit(1)
      .single();
    if (defaultSeller) {
      sellerInfo = defaultSeller;
      resolvedSellerId = defaultSeller.id;
    }
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('name');

  return {
    sellerId: resolvedSellerId,
    seller: sellerInfo,
    categories: categories || [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    const supabase = createAdminClient();
    const { sellerId: resolvedSellerId, seller, categories } = await resolveSellerAndCategories(
      supabase,
      sellerId
    );

    if (!resolvedSellerId) {
      return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 });
    }

    const { data: initialProducts, error } = await supabase
      .from('products')
      .select(`
        id,
        seller_id,
        category_id,
        name,
        description,
        price,
        image_url,
        stock,
        brand,
        installation_available,
        installation_price,
        is_active,
        created_at,
        categories (
          id,
          slug,
          name
        )
      `)
      .eq('seller_id', resolvedSellerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    let products = initialProducts;

    if (!error && (!products || products.length === 0)) {
      const fallbackRes = await supabase
        .from('products')
        .select(`
          id,
          seller_id,
          category_id,
          name,
          description,
          price,
          image_url,
          stock,
          brand,
          installation_available,
          installation_price,
          is_active,
          created_at,
          categories (
            id,
            slug,
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(24);
      if (!fallbackRes.error && fallbackRes.data) {
        products = fallbackRes.data;
      }
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (products || []).map((p) => {
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      const rawPrice = Number(p.price) || 0;
      const priceUSD = rawPrice > 50000 ? Math.max(1, Math.round(rawPrice / 13000)) : rawPrice;
      const priceUZS = rawPrice > 50000 ? rawPrice : Math.round(rawPrice * 13000);

      return {
        id: p.id,
        name: p.name,
        brand: p.brand || 'Custom Studio',
        price: priceUZS,
        priceUSD,
        priceUZS,
        spec: p.description || '',
        category: cat?.name || 'Boshqa',
        categoryId: p.category_id,
        categorySlug: cat?.slug || 'other',
        image: p.image_url || '/images/garage/bbs_wheel.jpg',
        stock: p.stock ?? 1,
        inStock: (p.stock ?? 1) > 0,
        rating: 5.0,
        installationAvailable: p.installation_available ?? true,
        installationPrice: p.installation_price ?? 0,
        createdAt: p.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      sellerId: resolvedSellerId,
      seller,
      products: mapped,
      categories,
      totalCount: mapped.length,
      inStockCount: mapped.filter((p) => p.inStock).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Check if this is a Bulk Import request from 1-Click Master Catalog Importer
    if (Array.isArray(body?.bulkItems)) {
      const parsedBulk = bulkImportSchema.safeParse(body);
      if (!parsedBulk.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid bulk import payload', details: parsedBulk.error.flatten() },
          { status: 400 }
        );
      }

      const { sellerId: resolvedSellerId, categories } = await resolveSellerAndCategories(
        supabase,
        parsedBulk.data.sellerId
      );

      if (!resolvedSellerId) {
        return NextResponse.json({ success: false, error: 'No active seller found' }, { status: 404 });
      }

      const defaultCategoryId = categories[0]?.id;

      const rowsToInsert = parsedBulk.data.bulkItems.map((item) => {
        const matchedCat = categories.find(
          (c) =>
            c.slug.toLowerCase().includes((item.category || '').toLowerCase()) ||
            c.name.toLowerCase().includes((item.category || '').toLowerCase())
        );

        const compatStr = item.compatibility?.length
          ? `Mos avtomobillar: ${item.compatibility.join(', ')}`
          : 'Universal / Chevrolet / BYD / Kia';

        return {
          seller_id: resolvedSellerId,
          category_id: matchedCat?.id || defaultCategoryId,
          name: item.name,
          brand: item.brand,
          price: Math.round(item.priceUSD * 13000),
          description: item.spec ? `${item.spec} · ${compatStr}` : compatStr,
          image_url: item.imageUrl,
          stock: item.stock,
          installation_available: true,
          installation_price: 0,
          is_active: true,
        };
      });

      const { data: inserted, error } = await supabase
        .from('products')
        .insert(rowsToInsert)
        .select('id, name, price, image_url, stock, brand, description, category_id');

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        importedCount: inserted?.length || rowsToInsert.length,
        products: inserted || [],
        message: `${inserted?.length || rowsToInsert.length} ta ehtiyot qism omborga muvaffaqiyatli qo‘shildi`,
      });
    }

    // Single Part Creation
    const validated = addPartSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      categoryId,
      brand,
      price,
      currency,
      stock,
      compatibility,
      spec,
      imageUrl,
      installationAvailable,
      installationPrice,
      sellerId,
    } = validated.data;

    const { sellerId: resolvedSellerId, categories } = await resolveSellerAndCategories(
      supabase,
      sellerId
    );

    if (!resolvedSellerId) {
      return NextResponse.json({ success: false, error: 'No active seller found' }, { status: 404 });
    }

    // Resolve category UUID (accepts UUID or slug/name)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedCategoryId = uuidRegex.test(categoryId) ? categoryId : undefined;
    if (!resolvedCategoryId) {
      const foundCat = categories.find(
        (c) =>
          c.slug.toLowerCase() === categoryId.toLowerCase() ||
          c.name.toLowerCase().includes(categoryId.toLowerCase())
      );
      resolvedCategoryId = foundCat?.id || categories[0]?.id;
    }

    const compatibilityStr = compatibility.join(', ');
    const fullDescription = `${spec ? `${spec} · ` : ''}Mos avtomobillar: ${compatibilityStr}`;

    // Convert input currency to UZS for storage consistency in products table
    const priceUSD = convertToUSD(price, currency as SupportedCurrency);
    const priceUZS = Math.max(13000, Math.round(priceUSD * 13000));

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        seller_id: resolvedSellerId,
        category_id: resolvedCategoryId,
        name,
        brand,
        price: priceUZS,
        description: fullDescription,
        image_url: imageUrl,
        stock,
        installation_available: installationAvailable,
        installation_price: installationPrice || 0,
        is_active: true,
      })
      .select('id, name, price, image_url, stock, brand, description, category_id')
      .single();

    if (error || !newProduct) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Database insert failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        id: newProduct.id,
        name: newProduct.name,
        price: priceUZS,
        priceUSD: Math.round(priceUSD),
        priceUZS,
        image: newProduct.image_url,
        stock: newProduct.stock,
        brand: newProduct.brand,
        spec: newProduct.description,
      },
      message: 'Mahsulot muvaffaqiyatli omborga qo‘shildi',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, stock, priceUSD, name, isActive } = body as {
      productId?: string;
      stock?: number;
      priceUSD?: number;
      name?: string;
      isActive?: boolean;
    };

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof stock === 'number') updates.stock = Math.max(0, Math.round(stock));
    if (typeof priceUSD === 'number' && priceUSD > 0) updates.price = Math.round(priceUSD * 13000);
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof isActive === 'boolean') updates.is_active = isActive;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select('id, name, price, stock, is_active')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
