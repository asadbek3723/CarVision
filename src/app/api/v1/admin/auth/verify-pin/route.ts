import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import {
  isAdminConfigured,
  adminConfigProblem,
  ADMIN_MIN_PIN_LENGTH,
  verifyPinConstantTime,
  createAdminSessionToken,
  getAdminCookieOptions,
} from '@/lib/admin-auth';
import { getSuperAdminId } from '@/server/auth/session';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';

const verifyPinSchema = z.object({ pin: z.string().min(1).max(32) });

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function fail(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: { code, message, ...extra } }, { status });
}

export async function POST(request: NextRequest) {
  try {
    // Factor 1: signed-in Supabase account with the server-set super_admin role.
    const adminId = await getSuperAdminId();
    if (!adminId) {
      return fail(403, 'NOT_ADMIN', 'Avval admin akkaunti bilan tizimga kiring.');
    }

    // Only an authenticated super_admin sees what exactly is misconfigured (never the values).
    if (!isAdminConfigured()) {
      const problem = adminConfigProblem();
      const hints: Record<string, string> = {
        PIN_MISSING: 'ADMIN_MASTER_PIN o‘rnatilmagan.',
        PIN_TOO_SHORT: `ADMIN_MASTER_PIN juda qisqa: kamida ${ADMIN_MIN_PIN_LENGTH} ta belgi bo‘lishi kerak.`,
        SECRET_MISSING: 'ADMIN_SESSION_SECRET o‘rnatilmagan.',
        SECRET_TOO_SHORT: 'ADMIN_SESSION_SECRET juda qisqa: kamida 32 ta belgi (openssl rand -hex 32).',
      };
      return fail(503, 'ADMIN_NOT_CONFIGURED', `Admin paneli sozlanmagan. ${hints[problem ?? 'PIN_MISSING']} Muhit o‘zgaruvchisini tuzatib, serverni qayta ishga tushiring.`, {
        reason: problem,
      });
    }

    const ip = clientIp(request);
    const key = `admin:${adminId}`;
    const [byAdmin, byIp] = await Promise.all([
      recentFailures('login_key', key, 'admin_pin', WINDOW_MS, false, true),
      recentFailures('ip', ip, 'admin_pin', WINDOW_MS, false, true),
    ]);
    if (byAdmin >= MAX_ATTEMPTS || byIp >= MAX_ATTEMPTS * 2) {
      return fail(429, 'RATE_LIMIT_EXCEEDED', "Ko'p marta xato terildi. 15 daqiqadan keyin urinib ko'ring.", {
        retryAfterSeconds: WINDOW_MS / 1000,
      });
    }

    const parsed = verifyPinSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'INVALID_INPUT', "PIN kod formati noto'g'ri.");

    // Factor 2: PIN
    if (!verifyPinConstantTime(parsed.data.pin)) {
      await recordAttempt('admin_pin', key, ip, false);
      const remaining = Math.max(0, MAX_ATTEMPTS - byAdmin - 1);
      return fail(401, 'INVALID_PIN', `PIN kod noto'g'ri. Qolgan urinishlar: ${remaining}`, {
        remainingAttempts: remaining,
      });
    }

    await recordAttempt('admin_pin', key, ip, true);

    try {
      await createAdminClient().from('admin_audit_log').insert({
        admin_id: adminId,
        action: 'ADMIN_LOGIN',
        target_entity: 'admin_session',
        ip_address: ip.slice(0, 45),
      });
    } catch {
      // Non-blocking
    }

    const options = getAdminCookieOptions();
    const response = NextResponse.json({ success: true, message: 'Admin xavfsizlik ruxsati berildi.' });
    response.cookies.set({
      name: options.name,
      value: createAdminSessionToken(adminId),
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
      maxAge: options.maxAge,
    });
    return response;
  } catch (error) {
    console.error('Admin PIN verification error:', error);
    return fail(500, 'INTERNAL_ERROR', 'Serverda xatolik yuz berdi.');
  }
}
