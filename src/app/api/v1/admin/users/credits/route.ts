import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminOr401, ipOf } from '@/server/admin';

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, 'Miqdor 0 bo‘lishi mumkin emas'),
  reason: z.string().trim().min(3, 'Sababni yozing').max(300),
});

const ERRORS: Record<string, string> = {
  NEGATIVE_BALANCE: 'Balans manfiy bo‘lib qoladi',
  USER_NOT_FOUND: 'Foydalanuvchi topilmadi',
  REASON_REQUIRED: 'Sababni yozing',
  INVALID_AMOUNT: 'Miqdor noto‘g‘ri',
};

/** Manual credit grant (+) or removal (-) with a mandatory reason, written to ledger and audit log. */
export async function POST(request: NextRequest) {
  const auth = adminOr401(request);
  if ('response' in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Ma’lumotlar noto‘g‘ri' }, { status: 400 });
  const { data } = await createAdminClient().rpc('admin_adjust_credits', {
    p_admin_id: auth.adminId,
    p_user_id: parsed.data.userId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_ip: ipOf(request),
  });
  const r = data as { success?: boolean; error?: string; balanceAfter?: number } | null;
  if (!r?.success) return NextResponse.json({ success: false, error: ERRORS[r?.error ?? ''] ?? 'Bajarib bo‘lmadi' }, { status: 409 });
  return NextResponse.json({ success: true, balance: r.balanceAfter });
}
