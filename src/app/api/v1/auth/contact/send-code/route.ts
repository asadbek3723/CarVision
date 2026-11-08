import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/auth/guards';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { emailTaken, parseEmail, parsePhone, phoneTaken } from '@/server/auth/contacts';
import { isSmsConfigured, requestOtp } from '@/server/sms';
import { isEmailConfigured, requestEmailCode } from '@/server/email';

export const dynamic = 'force-dynamic';

const schema = z.object({ kind: z.enum(['phone', 'email']), value: z.string().min(3).max(254) }).strict();

function fail(status: number, code: string, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, code, error, ...extra }, { status });
}

/**
 * Sends a one-time code to a NEW phone (SMS) or e-mail before Profile -> Edit saves it.
 * While the matching service is not configured this answers `verificationRequired: false`
 * and the profile save stores the contact unverified (same as registration without SMS).
 */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const session = guard.value;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'INVALID_INPUT', 'Ma’lumotlar noto‘g‘ri');
  const { kind, value } = parsed.data;

  const target = kind === 'phone' ? parsePhone(value) : parseEmail(value);
  if (!target) return kind === 'phone' ? fail(400, 'INVALID_PHONE', "Telefon raqam noto'g'ri") : fail(400, 'INVALID_EMAIL', "Email noto'g'ri");

  const current = kind === 'phone' ? session.profile.phone : session.profile.email;
  if (target === current) return fail(400, 'UNCHANGED', 'Bu sizning hozirgi kontaktingiz');

  if (kind === 'phone' ? await phoneTaken(target, session.userId) : await emailTaken(target, session.userId)) {
    return kind === 'phone' ? fail(409, 'PHONE_TAKEN', 'Bu raqam boshqa hisobga bog‘langan') : fail(409, 'EMAIL_TAKEN', 'Bu email boshqa hisobga bog‘langan');
  }

  const serviceOn = kind === 'phone' ? isSmsConfigured() : isEmailConfigured();
  if (!serviceOn) return NextResponse.json({ success: true, verificationRequired: false });

  const ip = clientIp(request);
  const attemptKind = kind === 'phone' ? 'otp_change_phone' : 'otp_change_email';
  if ((await recentFailures('login_key', session.userId, attemptKind, 60 * 60 * 1000, true)) >= 6) {
    return fail(429, 'RATE_LIMITED', "Juda ko'p so'rov. Birozdan keyin urinib ko'ring");
  }
  await recordAttempt(attemptKind, session.userId, ip, true);

  const result = kind === 'phone' ? await requestOtp(target, 'change_phone') : await requestEmailCode(target);
  if (!result.ok) {
    const status = result.code === 'TOO_SOON' ? 429 : 502;
    return fail(status, result.code, kind === 'phone' ? "SMS yuborib bo'lmadi" : "Xat yuborib bo'lmadi", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return NextResponse.json({ success: true, verificationRequired: true });
}
