import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, ipOf } from '@/server/admin';

export const dynamic = 'force-dynamic';

const PAGE = 30;
const FILTERS = ['all', 'paid', 'free', 'unverified'] as const;
type Filter = (typeof FILTERS)[number];

function applyFilter<Q extends { or: Function; eq: Function; neq: Function }>(q: Q, f: Filter, nowIso: string): Q {
  if (f === 'paid') return q.neq('current_plan_code', 'FREE_TRIAL').gt('plan_expires_at', nowIso);
  if (f === 'free') return q.or(`current_plan_code.eq.FREE_TRIAL,plan_expires_at.is.null,plan_expires_at.lte.${nowIso}`);
  if (f === 'unverified') return q.eq('is_verified', false);
  return q;
}

/** Workshops with owner, plan, credits and catalog size: searched, filtered and paged on the server. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const filter = (FILTERS as readonly string[]).includes(params.get('filter') ?? '') ? (params.get('filter') as Filter) : 'all';
    const offset = Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
    const q = (params.get('q') || '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 60);
    const db = createAdminClient();
    const nowIso = new Date().toISOString();

    let query = applyFilter(
      db.from('shops').select('id, owner_id, shop_name, city, district, phone, is_verified, current_plan_code, plan_expires_at, credits_balance, payout_details, created_at', { count: 'exact' }),
      filter,
      nowIso
    );
    if (q) {
      const { data: owners } = await db.from('profiles').select('id').or(`phone.ilike.%${q}%,full_name.ilike.%${q}%`).limit(50);
      const parts = [`shop_name.ilike.%${q}%`, `phone.ilike.%${q}%`, `city.ilike.%${q}%`, `district.ilike.%${q}%`];
      if (owners?.length) parts.push(`owner_id.in.(${owners.map((o) => o.id as string).join(',')})`);
      query = query.or(parts.join(','));
    }
    const { data: shops, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);

    const ownerIds = [...new Set((shops ?? []).map((s) => s.owner_id as string))];
    const shopIds = (shops ?? []).map((s) => s.id as string);
    const head = { count: 'exact' as const, head: true };
    const [{ data: owners }, { data: items }, ...counts] = await Promise.all([
      ownerIds.length ? db.from('profiles').select('id, full_name, phone, is_banned').in('id', ownerIds) : Promise.resolve({ data: [] }),
      shopIds.length ? db.from('catalog_items').select('shop_id').eq('status', 'PUBLISHED').in('shop_id', shopIds).limit(20000) : Promise.resolve({ data: [] }),
      ...FILTERS.map((f) => applyFilter(db.from('shops').select('id', head), f, nowIso)),
    ]);
    const ownerById = new Map((owners ?? []).map((o) => [o.id as string, o]));
    const itemCount = new Map<string, number>();
    for (const i of items ?? []) itemCount.set(i.shop_id as string, (itemCount.get(i.shop_id as string) ?? 0) + 1);

    const now = Date.now();
    const total = count ?? 0;
    return NextResponse.json({
      success: true,
      total,
      nextOffset: offset + (shops?.length ?? 0) < total ? offset + (shops?.length ?? 0) : null,
      counts: Object.fromEntries(FILTERS.map((f, i) => [f, (counts[i] as { count: number | null }).count ?? 0])),
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
          payoutDetails: (s.payout_details as string | null) ?? null,
          items: itemCount.get(s.id as string) ?? 0,
          createdAt: s.created_at as string,
        };
      }),
    });
  } catch (err) {
    console.error('admin shops error:', err);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
}

const patchSchema = z.union([
  z.object({ shopId: z.string().uuid(), verified: z.boolean() }).strict(),
  z.object({ shopId: z.string().uuid(), payoutDetails: z.string().trim().max(300) }).strict(),
]);

export async function PATCH(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Invalid input' }, { status: 400 });
  const db = createAdminClient();

  if ('payoutDetails' in parsed.data) {
    // Where the workshop's money goes: audited, because changing it redirects payouts.
    const { data: before } = await db.from('shops').select('payout_details').eq('id', parsed.data.shopId).maybeSingle();
    if (!before) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Not found' }, { status: 404 });
    const value = parsed.data.payoutDetails || null;
    const { error: auditErr } = await db.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      action: 'SET_PAYOUT_DETAILS',
      target_entity: 'shops',
      target_id: parsed.data.shopId,
      payload_before: { payoutDetails: before.payout_details ?? null },
      payload_after: { payoutDetails: value },
      ip_address: ipOf(request),
    });
    if (auditErr) {
      console.error('audit insert failed:', auditErr.message);
      return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
    }
    const { error } = await db.from('shops').update({ payout_details: value }).eq('id', parsed.data.shopId);
    if (error) return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data, error: rpcErr } = await db.rpc('admin_set_shop_verified', {
    p_admin_id: auth.adminId,
    p_shop_id: parsed.data.shopId,
    p_verified: parsed.data.verified,
    p_ip: ipOf(request),
  });
  if (rpcErr) {
    console.error('admin rpc failed:', rpcErr.message);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
  const r = data as { success?: boolean } | null;
  if (!r?.success) return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

const createSchema = z.object({ userId: z.string().uuid() }).strict();

/**
 * Opens a garage (shop row) for any account, e.g. a regular user who bought a paid plan. One
 * database transaction: the personal balance moves to the shop, the owner becomes a seller, audited.
 * The plan itself is then assigned from the Shops screen like for every other garage.
 */
export async function POST(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Invalid input' }, { status: 400 });
  const { data, error } = await createAdminClient().rpc('admin_open_garage', { p_admin_id: auth.adminId, p_user_id: parsed.data.userId, p_ip: ipOf(request) });
  if (error) {
    console.error('admin_open_garage failed:', error.message);
    return NextResponse.json({ success: false, code: 'CREATE_FAILED', error: 'Create failed' }, { status: 500 });
  }
  const r = data as { success?: boolean; error?: string; shopId?: string; created?: boolean } | null;
  if (!r?.success) return NextResponse.json({ success: false, code: 'USER_NOT_FOUND', error: 'User not found' }, { status: 404 });
  return NextResponse.json({ success: true, shopId: r.shopId, created: r.created }, { status: r.created ? 201 : 200 });
}
