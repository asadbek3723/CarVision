import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createAdminClient();
    let queryBuilder = supabase
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
        categories (
          id,
          slug,
          name
        ),
        sellers (
          id,
          business_name,
          phone,
          address
        )
      `)
      .eq('is_active', true)
      .limit(limit);

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    if (category && category !== 'All') {
      queryBuilder = queryBuilder.ilike('description', `%${category}%`);
    }

    const { data: products, error } = await queryBuilder;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Map to normalized frontend products
    const mapped = (products || []).map((p) => {
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      const seller = Array.isArray(p.sellers) ? p.sellers[0] : p.sellers;

      return {
        id: p.id,
        name: p.name,
        brand: p.brand || 'Custom Tuning',
        price: Number(p.price) || 0,
        spec: p.description || 'Professional Fitment',
        category: cat?.name || 'Accessories',
        image: p.image_url,
        image_url: p.image_url,
        inStock: (p.stock || 0) > 0,
        stock: p.stock || 0,
        rating: 4.95,
        ratingCount: 38,
        isNew: true,
        seller: {
          id: seller?.id || 'seller-1',
          business_name: seller?.business_name || 'CarVision Partner',
        },
        sellerName: seller?.business_name || 'CarVision Partner',
        compatibility: [
          { id: 'chevrolet-malibu-2', name: 'Chevrolet Malibu 2' },
          { id: 'byd-seal', name: 'BYD Seal' },
          { id: 'bmw-m4-g82', name: 'BMW M4 Competition' },
        ],
      };
    });

    return NextResponse.json({ success: true, products: mapped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
