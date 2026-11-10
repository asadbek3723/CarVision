import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminLiveOr401, ipOf } from '@/server/admin';

const schema = z
  .object({
    userId: z.string().uuid(),
    /** One id per form submission: a retried or double-clicked request is applied once. */
    requestId: z.string().uuid(),
    amount: z.number().int().min(-100000).max(100000).refine((n) => n !== 0),
    reason: z.string().trim().min(3).max(300),
    /** Optional sale: money received for these credits (amount x100 in `currency`). */
    payment: z
      .object({
        amountMinor: z.number().int().min(0).max(1_000_000_000_000),
        currency: z.enum(['USD', 'UZS', 'AED', 'EUR']),
        method: z.enum(['BANK_TRANSFER', 'CASH', 'OCTO', 'CLICK_PAYME_MANUAL']),
        reference: z.string().trim().max(120).optional(),
      })
      .optional(),
  })
  .strict();

/** Manual credit grant (+) or removal (-) with a mandatory reason, written to ledger and audit log. */
export async function POST(request: NextRequest) {
  const auth = await adminLiveOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Invalid input' }, { status: 400 });
  const { userId, requestId, amount, reason, payment } = parsed.data;
  if (payment && amount < 0) return NextResponse.json({ success: false, code: 'INVALID_PAYMENT', error: 'A sale must add credits' }, { status: 400 });
  const { data, error: rpcErr } = await createAdminClient().rpc('admin_adjust_credits', {
    p_admin_id: auth.adminId,
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ip: ipOf(request),
    p_request_id: requestId,
    p_paid_minor: payment?.amountMinor ?? null,
    p_currency: payment?.currency ?? null,
    p_method: payment?.method ?? null,
    p_reference: payment?.reference ?? null,
  });
  if (rpcErr) {
    console.error('admin rpc failed:', rpcErr.message);
    return NextResponse.json({ success: false, code: 'INTERNAL', error: 'Server error' }, { status: 500 });
  }
  const r = data as { success?: boolean; error?: string; balanceAfter?: number; balance?: number; replayed?: boolean } | null;
  if (!r?.success) {
    const code = r?.error ?? 'FAILED';
    return NextResponse.json({ success: false, code, error: code, ...(typeof r?.balance === 'number' ? { balance: r.balance } : {}) }, { status: code === 'USER_NOT_FOUND' ? 404 : 409 });
  }
  return NextResponse.json({ success: true, balance: r.balanceAfter, replayed: Boolean(r.replayed) });
}
