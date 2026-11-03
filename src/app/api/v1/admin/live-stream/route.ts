import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: gens, error } = await supabase
      .from('seller_generations')
      .select(`
        id,
        base_image,
        prompt,
        result_image,
        status,
        created_at,
        sellers (
          id,
          business_name
        ),
        products (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (gens || []).map((g) => {
      const seller = Array.isArray(g.sellers) ? g.sellers[0] : g.sellers;
      const product = Array.isArray(g.products) ? g.products[0] : g.products;
      const vehicle = g.prompt ? g.prompt.split(':')[0]?.trim() || 'Custom Vehicle' : 'Custom Vehicle';
      const partsApplied = product?.name || g.prompt || '4K Custom Fitment';

      return {
        id: g.id,
        studioName: seller?.business_name || 'Partner Atelier',
        vehicle,
        angle: '360° Smart Scan',
        partsApplied,
        status: g.status === 'done' ? ('COMPLETED' as const) : ('PROCESSING' as const),
        imageUrl: g.result_image || g.base_image || '/images/car-after.jpg',
        resolution: '3840 × 2160 (4K)',
        durationSeconds: 1.34,
        timeAgo: 'Hozirgina',
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
