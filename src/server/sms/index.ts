import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * SMS / OTP layer. Dormant until ESKIZ_EMAIL and ESKIZ_PASSWORD are set in the
 * environment: registration then automatically requires a phone OTP.
 * Until then phones are stored unverified and no SMS is sent.
 */

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_MIN_SECONDS = 60;

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

function hashCode(phone: string, code: string): string {
  const secret = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

export async function requestOtp(
  phoneE164: string
): Promise<{ ok: true } | { ok: false; code: 'SMS_DISABLED' | 'TOO_SOON' | 'SEND_FAILED'; retryAfterSeconds?: number }> {
  if (!isSmsConfigured()) return { ok: false, code: 'SMS_DISABLED' };
  const db = createAdminClient();

  const { data: last } = await db
    .from('otp_codes')
    .select('created_at')
    .eq('phone', phoneE164)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const age = (Date.now() - new Date(last.created_at as string).getTime()) / 1000;
    if (age < OTP_RESEND_MIN_SECONDS) {
      return { ok: false, code: 'TOO_SOON', retryAfterSeconds: Math.ceil(OTP_RESEND_MIN_SECONDS - age) };
    }
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  await db.from('otp_codes').insert({
    phone: phoneE164,
    code_hash: hashCode(phoneE164, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  try {
    await sendSms(phoneE164, `CarVision tasdiqlash kodi: ${code}`);
  } catch {
    return { ok: false, code: 'SEND_FAILED' };
  }
  return { ok: true };
}

export async function verifyOtp(phoneE164: string, code: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: row } = await db
    .from('otp_codes')
    .select('id, code_hash, attempts, expires_at')
    .eq('phone', phoneE164)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return false;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return false;
  if ((row.attempts as number) >= OTP_MAX_ATTEMPTS) return false;

  const expected = Buffer.from(row.code_hash as string);
  const actual = Buffer.from(hashCode(phoneE164, code));
  const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (ok) {
    await db.from('otp_codes').update({ consumed: true }).eq('id', row.id);
  } else {
    await db.from('otp_codes').update({ attempts: (row.attempts as number) + 1 }).eq('id', row.id);
  }
  return ok;
}
