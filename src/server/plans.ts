import { createAdminClient } from '@/lib/supabase/server';

export interface PublicPlan {
  code: string;
  name: string;
  priceUSD: number;
  credits: number;
  durationDays: number;
  watermark: boolean;
  maxDevices: number;
  maxItems: number;
}

const ORDER = ['FREE_TRIAL', 'PRO_800', 'MAX_4000', 'ULTRA_10000'];

/** The active, public plans in display order (from the database, so the admin can change them without a deploy). */
export async function listActivePlans(): Promise<PublicPlan[]> {
  const { data, error } = await createAdminClient()
    .from('pricing_plans')
    .select('code, name, price_cents, credits, duration_days, watermark_enabled, max_devices, max_custom_items')
    .eq('is_active', true)
    .neq('code', 'CUSTOM');
  if (error) throw new Error(error.message);
  return (data ?? [])
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
}
