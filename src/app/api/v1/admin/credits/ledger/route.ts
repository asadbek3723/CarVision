import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401 } from '@/server/admin';

export const dynamic = 'force-dynamic';
const PAGE = 40;

/** Credit history of one account (its personal and shop balance), newest first. */
export async function GET(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const userId = params.get('userId');
  const shopId = params.get('shopId');
  const offset = Math.max(0, Math.min(100_000, Number(params.get('offset')) || 0));
  const uuid = z.string().uuid();
  if ((!userId || !uuid.safeParse(userId).success) && (!shopId || !uuid.safeParse(shopId).success)) {
    return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'userId or shopId required' }, { status: 400 });
  }
  const db = createAdminClient();
  let q = db
    .from('credit_ledger')
    .select('id, user_id, shop_id, amount, balance_after, action_type, generation_id, description, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE - 1);
  q = userId ? q.eq('user_id', userId) : q.eq('shop_id', shopId as string);
  const { data, count, error } = await q;
  if (error) {
    console.error('ledger read failed:', error.message);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
  const total = count ?? 0;
  const rows = data ?? [];
  return NextResponse.json({
    success: true,
    total,
    nextOffset: offset + rows.length < total ? offset + rows.length : null,
    entries: rows.map((r) => ({
      id: r.id as string,
      scope: r.shop_id ? ('shop' as const) : ('personal' as const),
      amount: r.amount as number,
      balanceAfter: r.balance_after as number,
      action: r.action_type as string,
      description: (r.description as string | null) ?? '',
      at: r.created_at as string,
    })),
  });
}
