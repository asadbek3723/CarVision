import { createCode, verifyCode, type OtpPurpose } from '@/server/otp';

/**
 * SMS / OTP layer. Dormant until ESKIZ_EMAIL and ESKIZ_PASSWORD are set in the
 * environment: registration then automatically requires a phone OTP.
 * Until then phones are stored unverified and no SMS is sent.
 */

export function isSmsConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL?.trim() && process.env.ESKIZ_PASSWORD?.trim());
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function eskizToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const form = new FormData();
  form.set('email', process.env.ESKIZ_EMAIL ?? '');
  form.set('password', process.env.ESKIZ_PASSWORD ?? '');
  const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error('Eskiz auth failed');
  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error('Eskiz token missing');
  cachedToken = { value: token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 };
  return token;
}

async function sendSms(phoneE164: string, message: string): Promise<void> {
  const token = await eskizToken();
  const form = new FormData();
  form.set('mobile_phone', phoneE164.replace(/\D/g, ''));
  form.set('message', message);
  form.set('from', process.env.ESKIZ_SENDER?.trim() || '4546');
  const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    cachedToken = null;
    throw new Error('SMS delivery failed');
  }
}

export async function requestOtp(
  phoneE164: string,
  purpose: OtpPurpose = 'register'
): Promise<{ ok: true } | { ok: false; code: 'SMS_DISABLED' | 'TOO_SOON' | 'SEND_FAILED'; retryAfterSeconds?: number }> {
  if (!isSmsConfigured()) return { ok: false, code: 'SMS_DISABLED' };
  const created = await createCode(phoneE164, purpose);
  if (!created.ok) return { ok: false, code: 'TOO_SOON', retryAfterSeconds: created.retryAfterSeconds };
  try {
    await sendSms(phoneE164, `CarVision tasdiqlash kodi: ${created.code}`);
  } catch {
    return { ok: false, code: 'SEND_FAILED' };
  }
  return { ok: true };
}

export async function verifyOtp(phoneE164: string, code: string, purpose: OtpPurpose = 'register'): Promise<boolean> {
  return verifyCode(phoneE164, code, purpose);
}
