import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { normalizePhone } from '@/server/auth/phone';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { isSmsConfigured, requestOtp } from '@/server/sms';

const schema = z.object({ identifier: z.string().min(5).max(40) });

/**
 * Sends a registration OTP. While SMS is not configured (no ESKIZ_* env vars) this
 * reports `smsRequired: false` so the UI skips the verification step.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_PHONE', error: 'Telefon raqam kerak' }, { status: 400 });

  if (!isSmsConfigured()) return NextResponse.json({ success: true, smsRequired: false });

  const phone = normalizePhone(parsed.data.identifier);
  if (!phone) return NextResponse.json({ success: false, code: 'INVALID_PHONE', error: "Telefon raqam noto'g'ri" }, { status: 400 });

  const ip = clientIp(request);
  if ((await recentFailures('ip', ip, 'otp', 60 * 60 * 1000, true)) >= 10) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: "Juda ko'p so'rov" }, { status: 429 });
  }
  await recordAttempt('otp', phone, ip, true);

  const result = await requestOtp(phone);
  if (!result.ok) {
    const status = result.code === 'TOO_SOON' ? 429 : 502;
    return NextResponse.json(
      { success: false, code: result.code, retryAfterSeconds: result.retryAfterSeconds, error: "SMS yuborib bo'lmadi" },
      { status }
    );
  }
  return NextResponse.json({ success: true, smsRequired: true });
}
