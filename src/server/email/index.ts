import { createCode, verifyCode } from '@/server/otp';

/**
 * E-mail verification layer. Dormant until a mail provider is configured (EMAIL_PROVIDER_KEY and
 * EMAIL_FROM): until then e-mail addresses are saved unverified and no message is sent, the same
 * way phones work while SMS is off. Wiring a provider only means filling in `deliver` below.
 */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_PROVIDER_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

/** Lower-cased, trimmed form used for storage, lookups and codes. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function deliver(_to: string, _subject: string, _text: string): Promise<void> {
  // No provider is connected yet. When one is (Resend, Postmark, SES…), send the message here.
  throw new Error('E-mail provider is not connected');
}

export async function requestEmailCode(
  email: string
): Promise<{ ok: true } | { ok: false; code: 'EMAIL_DISABLED' | 'TOO_SOON' | 'SEND_FAILED'; retryAfterSeconds?: number }> {
  if (!isEmailConfigured()) return { ok: false, code: 'EMAIL_DISABLED' };
  const created = await createCode(email, 'change_email');
  if (!created.ok) return { ok: false, code: 'TOO_SOON', retryAfterSeconds: created.retryAfterSeconds };
  try {
    await deliver(email, 'CarVision: tasdiqlash kodi', `CarVision tasdiqlash kodi: ${created.code}\nKod 5 daqiqa amal qiladi.`);
  } catch {
    return { ok: false, code: 'SEND_FAILED' };
  }
  return { ok: true };
}

export function verifyEmailCode(email: string, code: string): Promise<boolean> {
  return verifyCode(email, code, 'change_email');
}
