import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';

export const dynamic = 'force-dynamic';

/** The signed-in user's own credit ledger (newest first). */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { data, error } = await createAdminClient()
    .from('credit_ledger')
    .select('id, amount, balance_after, action_type, description, created_at')
    .eq('user_id', guard.value.userId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  return NextResponse.json({
    success: true,
    balance: guard.value.shop ? guard.value.shop.credits_balance : guard.value.profile.credits_balance,
    entries: (data ?? []).map((r) => ({
      id: r.id as string,
      amount: r.amount as number,
      balanceAfter: r.balance_after as number,
      type: r.action_type as string,
      description: (r.description as string | null) ?? '',
      at: r.created_at as string,
    })),
  });
}
