import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, ipOf } from '@/server/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const q = (params.get('q') || '').replace(/[%,()*]/g, ' ').trim();
    const role = params.get('role');
    const db = createAdminClient();

    let query = db
      .from('profiles')
      .select('id, role, full_name, phone, credits_balance, is_banned, banned_reason, phone_verified, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(200);
    if (role === 'b2c_user' || role === 'b2b_seller' || role === 'super_admin') query = query.eq('role', role);
    if (q) query = query.or(`phone.ilike.%${q}%,full_name.ilike.%${q}%`);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((u) => u.id as string);
    const { data: shops } = ids.length ? await db.from('shops').select('owner_id, shop_name, credits_balance, current_plan_code').in('owner_id', ids) : { data: [] };
    const shopByOwner = new Map((shops ?? []).map((s) => [s.owner_id as string, s]));

    return NextResponse.json({
      success: true,
      total: count ?? 0,
      users: (data ?? []).map((u) => {
        const shop = shopByOwner.get(u.id as string);
        return {
          id: u.id as string,
          role: u.role as string,
          name: (u.full_name as string) || '',
          phone: u.phone as string,
          credits: shop ? (shop.credits_balance as number) : (u.credits_balance as number),
          plan: shop ? (shop.current_plan_code as string) : 'FREE_TRIAL',
          shopName: shop ? (shop.shop_name as string) : null,
          banned: Boolean(u.is_banned),
          bannedReason: (u.banned_reason as string | null) ?? null,
          phoneVerified: Boolean(u.phone_verified),
          createdAt: u.created_at as string,
        };
      }),
    });
  } catch (err) {
    console.error('admin users error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

const banSchema = z.object({ userId: z.string().uuid(), banned: z.boolean(), reason: z.string().trim().max(300).optional() });

const BAN_ERRORS: Record<string, string> = {
  CANNOT_BAN_SELF: 'O‘zingizni bloklab bo‘lmaydi',
  CANNOT_BAN_ADMIN: 'Admin akkauntini bloklab bo‘lmaydi',
  USER_NOT_FOUND: 'Foydalanuvchi topilmadi',
};

export async function PATCH(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = banSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Ma’lumotlar noto‘g‘ri' }, { status: 400 });
  const { data } = await createAdminClient().rpc('admin_set_ban', {
    p_admin_id: auth.adminId,
    p_user_id: parsed.data.userId,
    p_banned: parsed.data.banned,
    p_reason: parsed.data.reason ?? null,
    p_ip: ipOf(request),
  });
  const r = data as { success?: boolean; error?: string } | null;
  if (!r?.success) return NextResponse.json({ success: false, error: BAN_ERRORS[r?.error ?? ''] ?? 'Bajarib bo‘lmadi' }, { status: 409 });
  return NextResponse.json({ success: true });
}
