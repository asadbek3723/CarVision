import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { isStrongEnoughPassword, normalizePhone, phoneToEmail } from '@/server/auth/phone';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';

const schema = z.object({ currentPassword: z.string().min(1).max(72), newPassword: z.string().min(8).max(72) }).strict();

const fail = (status: number, code: string, error: string) => NextResponse.json({ success: false, code, error }, { status });

/** Changes the password after re-checking the current one (5 wrong tries per 15 minutes). */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { userId, profile } = guard.value;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Parollarni kiriting');
  if (!isStrongEnoughPassword(parsed.data.newPassword)) return fail(400, 'WEAK_PASSWORD', 'Yangi parol kamida 8 belgi bo‘lib, harf va raqam bo‘lishi kerak');
  if (parsed.data.newPassword === parsed.data.currentPassword) return fail(400, 'SAME_PASSWORD', 'Yangi parol eskisidan farq qilishi kerak');

  const key = `pw:${userId}`;
  if ((await recentFailures('login_key', key, 'password', 15 * 60 * 1000)) >= 5) {
    return fail(429, 'RATE_LIMITED', 'Juda ko‘p xato urinish. 15 daqiqadan keyin urinib ko‘ring');
  }

  const phone = normalizePhone(profile.phone);
  if (!phone) return fail(500, 'INTERNAL', 'Akkaunt ma’lumotlari noto‘g‘ri');

  // Verify the current password with a throwaway client so the browser session is untouched
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyErr } = await verifier.auth.signInWithPassword({ email: phoneToEmail(phone), password: parsed.data.currentPassword });
  if (verifyErr) {
    await recordAttempt('password', key, clientIp(request), false);
    return fail(401, 'WRONG_PASSWORD', 'Joriy parol noto‘g‘ri');
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: parsed.data.newPassword });
  if (error) return fail(500, 'UPDATE_FAILED', 'Parolni almashtirib bo‘lmadi');
  return NextResponse.json({ success: true });
}
