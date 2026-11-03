import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminOr401, ipOf } from '@/server/admin';

export const dynamic = 'force-dynamic';

/** All workshops with owner, plan, credits and catalog size. */
export async function GET(request: NextRequest) {
  const auth = adminOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const db = createAdminClient();
    const { data: shops, error } = await db
      .from('shops')
      .select('id, owner_id, shop_name, city, district, phone, is_verified, current_plan_code, plan_expires_at, credits_balance, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ownerIds = [...new Set((shops ?? []).map((s) => s.owner_id as string))];
    const [{ data: owners }, { data: items }] = await Promise.all([
      ownerIds.length ? db.from('profiles').select('id, full_name, phone, is_banned').in('id', ownerIds) : Promise.resolve({ data: [] }),
      db.from('catalog_items').select('shop_id').eq('status', 'PUBLISHED').limit(20000),
    ]);
    const ownerById = new Map((owners ?? []).map((o) => [o.id as string, o]));
    const itemCount = new Map<string, number>();
    for (const i of items ?? []) itemCount.set(i.shop_id as string, (itemCount.get(i.shop_id as string) ?? 0) + 1);

    const now = Date.now();
    return NextResponse.json({
      success: true,
      shops: (shops ?? []).map((s) => {
        const o = ownerById.get(s.owner_id as string);
        const expires = s.plan_expires_at as string | null;
        const isPaid = s.current_plan_code !== 'FREE_TRIAL' && Boolean(expires) && new Date(expires as string).getTime() > now;
        return {
          id: s.id as string,
          ownerId: s.owner_id as string,
          name: s.shop_name as string,
          city: s.city as string,
          district: s.district as string,
          phone: s.phone as string,
          ownerName: (o?.full_name as string) || '',
          ownerPhone: (o?.phone as string) || '',
          banned: Boolean(o?.is_banned),
          verified: Boolean(s.is_verified),
          plan: s.current_plan_code as string,
          isPaid,
          expiresAt: expires,
          credits: s.credits_balance as number,
          items: itemCount.get(s.id as string) ?? 0,
          createdAt: s.created_at as string,
        };
      }),
    });
  } catch (err) {
    console.error('admin shops error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

const patchSchema = z.object({ shopId: z.string().uuid(), verified: z.boolean() });

export async function PATCH(request: NextRequest) {
  const auth = adminOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Ma’lumotlar noto‘g‘ri' }, { status: 400 });
  const { data } = await createAdminClient().rpc('admin_set_shop_verified', {
    p_admin_id: auth.adminId,
    p_shop_id: parsed.data.shopId,
    p_verified: parsed.data.verified,
    p_ip: ipOf(request),
  });
  const r = data as { success?: boolean } | null;
  if (!r?.success) return NextResponse.json({ success: false, error: 'Ustaxona topilmadi' }, { status: 404 });
  return NextResponse.json({ success: true });
}
