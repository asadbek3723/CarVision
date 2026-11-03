import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ORDER = ['FREE_TRIAL', 'PRO_800', 'MAX_4000', 'ULTRA_10000'];

/** Public plan list (from the database, so the admin can change it without a deploy). */
export async function GET() {
  try {
    const { data, error } = await createAdminClient()
      .from('pricing_plans')
      .select('code, name, price_cents, credits, duration_days, watermark_enabled, max_devices, max_custom_items')
      .eq('is_active', true)
      .neq('code', 'CUSTOM');
    if (error) throw new Error(error.message);
    const plans = (data ?? [])
      .map((p) => ({
        code: p.code as string,
        name: p.name as string,
        priceUSD: (p.price_cents as number) / 100,
        credits: p.credits as number,
        durationDays: p.duration_days as number,
        watermark: p.watermark_enabled as boolean,
        maxDevices: p.max_devices as number,
        maxItems: p.max_custom_items as number,
      }))
      .sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code));
    return NextResponse.json({ success: true, plans });
  } catch (err) {
    console.error('plans error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}
