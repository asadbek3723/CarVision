/**
 * Phone helpers. Accounts are keyed by phone number; Supabase Auth itself stores a
 * synthetic, never-mailed address derived from the phone so that password auth works
 * today and real SMS (Eskiz) can be switched on later without touching accounts.
 */

export const PHONE_EMAIL_DOMAIN = 'phone.carvision.app';

/** Normalises user input to E.164. Defaults to Uzbekistan (+998) for 9-digit numbers. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function phoneToEmail(e164: string): string {
  return `${e164.replace(/\D/g, '')}@${PHONE_EMAIL_DOMAIN}`;
}

export function isStrongEnoughPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 72 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
