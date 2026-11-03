import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession, loadSession } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, code: 'UNAUTHENTICATED', error: 'Kirish talab qilinadi' }, { status: 401 });
  }
  await createAdminClient().rpc('claim_monthly_credits', { p_user_id: session.userId });
  const fresh = (await loadSession(session.userId)) ?? session;
  return NextResponse.json({ success: true, user: fresh.profile });
}

const patchSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    preferredLocale: z.enum(['uz', 'en', 'ru', 'ar', 'tr', 'kk', 'ky', 'tg']).optional(),
  })
  .strict();

/** Name and language only. The phone is the account identity and changes need verification. */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, code: 'UNAUTHENTICATED', error: 'Kirish talab qilinadi' }, { status: 401 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Ma’lumotlar noto‘g‘ri' }, { status: 400 });
  }
  const updates: Record<string, string> = {};
  if (parsed.data.fullName) updates['full_name'] = parsed.data.fullName;
  if (parsed.data.preferredLocale) updates['preferred_locale'] = parsed.data.preferredLocale;
  const { error } = await createAdminClient().from('profiles').update(updates).eq('id', session.userId);
  if (error) return NextResponse.json({ success: false, code: 'SAVE_FAILED', error: 'Saqlab bo‘lmadi' }, { status: 500 });
  const fresh = (await loadSession(session.userId)) ?? session;
  return NextResponse.json({ success: true, user: fresh.profile });
}
