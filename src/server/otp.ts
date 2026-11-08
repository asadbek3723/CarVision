import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * One-time codes shared by every flow that proves ownership of a phone or an e-mail address:
 * registration (phone), changing the phone and adding / changing the e-mail. Codes live in
 * `otp_codes` (the `phone` column holds the target, whatever its kind), hashed, single-use,
 * five minutes, five guesses.
 */

export type OtpPurpose = 'register' | 'change_phone' | 'change_email';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MIN_SECONDS = 60;

/** The hash input. Registration keeps its original form so codes already sent stay valid. */
export function otpHashInput(target: string, code: string, purpose: OtpPurpose): string {
  return purpose === 'register' ? `${target}:${code}` : `${purpose}:${target}:${code}`;
}

function hashCode(target: string, code: string, purpose: OtpPurpose): string {
  const secret = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHmac('sha256', secret).update(otpHashInput(target, code, purpose)).digest('hex');
}

export type CreateCodeResult = { ok: true; code: string } | { ok: false; code: 'TOO_SOON'; retryAfterSeconds: number };

/** Stores a fresh code for `target` and returns it (the caller delivers it). One per minute per target. */
export async function createCode(target: string, purpose: OtpPurpose): Promise<CreateCodeResult> {
  const db = createAdminClient();
  const { data: last } = await db
    .from('otp_codes')
    .select('created_at')
    .eq('phone', target)
    .eq('purpose', purpose)
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
    phone: target,
    purpose,
    code_hash: hashCode(target, code, purpose),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  return { ok: true, code };
}

/** True once for the right, unexpired code; every guess counts against the limit. */
export async function verifyCode(target: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const db = createAdminClient();
  const { data: row } = await db
    .from('otp_codes')
    .select('id, code_hash, attempts, expires_at')
    .eq('phone', target)
    .eq('purpose', purpose)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return false;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return false;
  if ((row.attempts as number) >= OTP_MAX_ATTEMPTS) return false;

  // Claim one attempt atomically (compare-and-set on the counter): parallel guesses cannot all
  // read the same count and slip past OTP_MAX_ATTEMPTS.
  const { data: claimed } = await db
    .from('otp_codes')
    .update({ attempts: (row.attempts as number) + 1 })
    .eq('id', row.id)
    .eq('attempts', row.attempts as number)
    .eq('consumed', false)
    .select('id')
    .maybeSingle();
  if (!claimed) return false;

  const expected = Buffer.from(row.code_hash as string);
  const actual = Buffer.from(hashCode(target, code, purpose));
  let ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (ok) {
    // A code can be used once, even if two correct requests race.
    const { data: used } = await db.from('otp_codes').update({ consumed: true }).eq('id', row.id).eq('consumed', false).select('id').maybeSingle();
    ok = Boolean(used);
  }
  return ok;
}
