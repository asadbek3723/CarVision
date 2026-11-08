import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/server/auth/phone';
import { normalizeEmail } from '@/server/email';

/** Parsing and ownership checks shared by "send a code" and "save the profile". */

const emailSchema = z.string().trim().max(254).email();

export function parseEmail(raw: string): string | null {
  const parsed = emailSchema.safeParse(raw);
  return parsed.success ? normalizeEmail(parsed.data) : null;
}

export function parsePhone(raw: string): string | null {
  return normalizePhone(raw);
}

/** True when another account already uses this phone. */
export async function phoneTaken(phoneE164: string, userId: string): Promise<boolean> {
  const { data } = await createAdminClient().from('profiles').select('id').eq('phone', phoneE164).neq('id', userId).limit(1).maybeSingle();
  return Boolean(data);
}

/** True when another account already uses this e-mail (stored lower-case). */
export async function emailTaken(email: string, userId: string): Promise<boolean> {
  const { data } = await createAdminClient().from('profiles').select('id').eq('email', email).neq('id', userId).limit(1).maybeSingle();
  return Boolean(data);
}
