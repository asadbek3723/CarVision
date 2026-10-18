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
      .eq('is_active', true);

    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    if (id) {
      queryBuilder = queryBuilder.eq('id', id);
    } else if (ids) {
      const idList = ids.split(',').filter(Boolean);
      if (idList.length > 0) {
        queryBuilder = queryBuilder.in('id', idList);
      }
    }

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    if (category && category !== 'All') {
      queryBuilder = queryBuilder.ilike('description', `%${category}%`);
    }

    const { data: products, error } = await queryBuilder.limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Map to normalized frontend products
    const mapped = (products || []).map((p) => {
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      const seller = Array.isArray(p.sellers) ? p.sellers[0] : p.sellers;

      // Derive the single exact vehicle model for this part (1 part = 1 car model rule)
      const text = `${p.name} ${p.description || ''}`.toLowerCase();
      let singleCar = { id: 'chevrolet-gentra', name: 'Chevrolet Gentra' };
      if (text.includes('malibu')) singleCar = { id: 'chevrolet-malibu-2', name: 'Chevrolet Malibu 2' };
      else if (text.includes('cobalt')) singleCar = { id: 'chevrolet-cobalt', name: 'Chevrolet Cobalt' };
      else if (text.includes('tracker')) singleCar = { id: 'chevrolet-tracker-2', name: 'Chevrolet Tracker 2' };
      else if (text.includes('monza')) singleCar = { id: 'chevrolet-monza', name: 'Chevrolet Monza' };
      else if (text.includes('onix')) singleCar = { id: 'chevrolet-onix', name: 'Chevrolet Onix' };
      else if (text.includes('song')) singleCar = { id: 'byd-song-plus', name: 'BYD Song Plus' };
      else if (text.includes('chazor') || text.includes('byd')) singleCar = { id: 'byd-chazor', name: 'BYD Chazor' };
      else if (text.includes('k5') || text.includes('kia')) singleCar = { id: 'kia-k5', name: 'Kia K5' };
      else if (text.includes('li ') || text.includes('l9')) singleCar = { id: 'li-auto-l9', name: 'Li Auto L9' };
      else if (text.includes('zeekr')) singleCar = { id: 'zeekr-001', name: 'Zeekr 001' };
      else if (text.includes('nexia')) singleCar = { id: 'chevrolet-nexia-3', name: 'Chevrolet Nexia 3' };
      else if (text.includes('spark')) singleCar = { id: 'chevrolet-spark', name: 'Chevrolet Spark' };
      else if (text.includes('lacetti')) singleCar = { id: 'chevrolet-lacetti', name: 'Chevrolet Lacetti' };

      const compatibility = [singleCar];

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
        targetCar: singleCar.name,
        seller: {
          id: seller?.id || 'seller-1',
          business_name: seller?.business_name || 'CarVision Partner',
          phone: seller?.phone || '+998 90 123 45 67',
          address: seller?.address || 'Toshkent sh., Sergeli avto-tuning markazi, 14-ustaxona',
        },
        sellerName: seller?.business_name || 'CarVision Partner',
        compatibility,
      };
    });

    return NextResponse.json({ success: true, products: mapped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
