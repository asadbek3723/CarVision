import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Public marketplace listing. Anti-disintermediation: contact details are never
 * returned here, only a masked label, the district and the real stored rating.
 */
export async function GET() {
  try {
    const { data, error } = await createAdminClient()
      .from('shops')
      .select('id, city, district, logo_url, rating_avg, rating_count')
      .eq('is_verified', true)
      .order('rating_avg', { ascending: false })
      .limit(100);

    if (error) {
      console.error('shops list error:', error.message);
      return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
    }

    const shops = (data ?? []).map((s) => ({
      id: s.id as string,
      maskedLabel: `Verified Partner #${(s.id as string).slice(0, 4).toUpperCase()}`,
      district: (s.district as string) || (s.city as string),
      ratingAvg: Number(s.rating_avg),
      ratingCount: s.rating_count as number,
      logoUrl: (s.logo_url as string | null) ?? undefined,
    }));

    return NextResponse.json({ success: true, shops });
  } catch (err) {
    console.error('shops list exception:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
