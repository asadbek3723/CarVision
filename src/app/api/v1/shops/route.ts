import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, business_name, description, phone, address, verified, credits, created_at')
      .order('verified', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const shops = (sellers || []).map((s, idx) => {
      const addressParts = (s.address || '').split(',').map((p: string) => p.trim());
      const district = addressParts[1] || addressParts[0] || 'Toshkent';

      return {
        id: s.id,
        maskedLabel: s.business_name,
        district,
        distanceKm: Number((2.5 + idx * 1.4).toFixed(1)),
        ratingAvg: Number((4.85 + (idx % 3) * 0.05).toFixed(2)),
        ratingCount: 20 + idx * 12,
        logoUrl: undefined,
        activeOffersCount: 30 + idx * 15,
        phone: s.phone,
        address: s.address,
      };
    });

    return NextResponse.json({ success: true, shops });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
