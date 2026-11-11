import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { LISTED_ITEMS } from '@/server/catalog';

export const dynamic = 'force-dynamic';

/** Real storefront numbers for the home page (no invented figures). */
export async function GET() {
  try {
    const db = createAdminClient();
    const [{ count: items }, { count: models }, { data: rows }] = await Promise.all([
      db.from(LISTED_ITEMS).select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      db.from('vehicle_models').select('id', { count: 'exact', head: true }).eq('is_active', true),
      db.from(LISTED_ITEMS).select('brand, shop_id').eq('status', 'PUBLISHED').limit(2000),
    ]);
    const brands = new Set((rows ?? []).map((r) => (r.brand as string | null)?.trim().toLowerCase()).filter(Boolean));
    const shops = new Set((rows ?? []).map((r) => r.shop_id as string));
    return NextResponse.json(
      { success: true, stats: { parts: items ?? 0, brands: brands.size, workshops: shops.size, vehicleModels: models ?? 0 } },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('stats error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
