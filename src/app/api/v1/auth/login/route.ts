import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { loadSession } from '@/server/auth/session';
import { normalizePhone, phoneToEmail } from '@/server/auth/phone';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';

const loginSchema = z.object({
  identifier: z.string().min(5).max(40),
  password: z.string().min(1).max(72),
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 20;

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ success: false, code, error }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Telefon raqam va parolni kiriting');

    const phone = normalizePhone(parsed.data.identifier);
    if (!phone) return fail(400, 'INVALID_PHONE', "Telefon raqam noto'g'ri");

    const ip = clientIp(request);
    const [byAccount, byIp] = await Promise.all([
      recentFailures('login_key', phone, 'login', WINDOW_MS),
      recentFailures('ip', ip, 'login', WINDOW_MS),
    ]);
    if (byAccount >= MAX_PER_ACCOUNT || byIp >= MAX_PER_IP) {
      return fail(429, 'RATE_LIMITED', "Juda ko'p xato urinish. 15 daqiqadan keyin qayta urinib ko'ring");
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: parsed.data.password,
    });

    if (error || !data.user) {
      await recordAttempt('login', phone, ip, false);
      return fail(401, 'INVALID_CREDENTIALS', "Telefon raqam yoki parol noto'g'ri");
    }

    // Monthly free credits (idempotent, once per 30 days) run before the single profile read,
    // so the returned balance is already fresh and login needs one fewer database round trip.
    await createAdminClient().rpc('claim_monthly_credits', { p_user_id: data.user.id });
    const session = await loadSession(data.user.id);
    if (!session) {
      await supabase.auth.signOut();
      return fail(401, 'INVALID_CREDENTIALS', "Telefon raqam yoki parol noto'g'ri");
    }
    if (session.isBanned) {
      await supabase.auth.signOut();
      return fail(403, 'ACCOUNT_BLOCKED', 'Akkaunt bloklangan');
    }

    // Audit row is not needed for the response: write it after the reply is sent.
    after(() => recordAttempt('login', phone, ip, true));

    return NextResponse.json({ success: true, user: session.profile });
  } catch (err) {
    console.error('Login error:', err);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
}
