import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession, loadSession, lookupSession } from '@/server/auth/session';
import { phoneToEmail } from '@/server/auth/phone';
import { emailTaken, parseEmail, parsePhone, phoneTaken } from '@/server/auth/contacts';
import { isSmsConfigured, verifyOtp } from '@/server/sms';
import { isEmailConfigured, verifyEmailCode } from '@/server/email';
import { profilePatchSchema } from '@/server/auth/profile-patch';

export const dynamic = 'force-dynamic';

// The monthly top-up takes a row lock and only matters once per 30 days, so it is claimed at most
// once per 10 minutes per user per server instance instead of on every profile refresh.
const CLAIM_EVERY_MS = 10 * 60 * 1000;
const lastClaim = new Map<string, number>();
function shouldClaim(userId: string): boolean {
  const now = Date.now();
  if ((lastClaim.get(userId) ?? 0) > now - CLAIM_EVERY_MS) return false;
  if (lastClaim.size > 5000) lastClaim.clear();
  lastClaim.set(userId, now);
  return true;
}

export async function GET() {
  const lookup = await lookupSession();
  if (lookup.status === 'unavailable') {
    // Could not check right now: the app keeps the user signed in and asks again later.
    return NextResponse.json({ success: false, code: 'AUTH_UNAVAILABLE', error: 'Vaqtincha tekshirib bo‘lmadi' }, { status: 503 });
  }
  if (lookup.status === 'none') {
    return NextResponse.json({ success: false, code: 'UNAUTHENTICATED', error: 'Kirish talab qilinadi' }, { status: 401 });
  }
  const session = lookup.session;
  if (!shouldClaim(session.userId)) return NextResponse.json({ success: true, user: session.profile });
  await createAdminClient().rpc('claim_monthly_credits', { p_user_id: session.userId });
  const fresh = (await loadSession(session.userId)) ?? session;
  return NextResponse.json({ success: true, user: fresh.profile });
}

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ success: false, code, error }, { status });
}

/**
 * Profile -> Edit saves everything in one request: name, phone and e-mail.
 * A new phone or e-mail must be proven with the code from /auth/contact/send-code while the matching
 * service is configured; until then it is stored unverified. A new phone is also the new login, so the
 * Supabase Auth address derived from it is changed in the same request.
 */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return fail(401, 'UNAUTHENTICATED', 'Kirish talab qilinadi');

  const parsed = profilePatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return fail(400, 'INVALID_INPUT', 'Ma’lumotlar noto‘g‘ri');
  const input = parsed.data;
  const userId = session.userId;

  // 1. Validate and check ownership before anything is written.
  let newPhone: string | null = null;
  if (input.phone !== undefined) {
    const phone = parsePhone(input.phone);
    if (!phone) return fail(400, 'INVALID_PHONE', "Telefon raqam noto'g'ri");
    if (phone !== session.profile.phone) newPhone = phone;
  }

  let newEmail: string | null | undefined; // undefined = unchanged, null = remove
  if (input.email !== undefined) {
    const raw = input.email ?? '';
    if (raw === '') newEmail = session.profile.email ? null : undefined;
    else {
      const email = parseEmail(raw);
      if (!email) return fail(400, 'INVALID_EMAIL', "Email noto'g'ri");
      if (email !== session.profile.email) newEmail = email;
    }
  }

  if (newPhone && (await phoneTaken(newPhone, userId))) return fail(409, 'PHONE_TAKEN', 'Bu raqam boshqa hisobga bog‘langan');
  if (newEmail && (await emailTaken(newEmail, userId))) return fail(409, 'EMAIL_TAKEN', 'Bu email boshqa hisobga bog‘langan');

  const smsOn = isSmsConfigured();
  const emailOn = isEmailConfigured();
  if (newPhone && smsOn) {
    if (!input.phoneCode) return fail(400, 'PHONE_CODE_REQUIRED', 'SMS tasdiqlash kodi kerak');
    if (!(await verifyOtp(newPhone, input.phoneCode, 'change_phone'))) return fail(400, 'PHONE_CODE_INVALID', "Kod noto'g'ri yoki eskirgan");
  }
  if (newEmail && emailOn) {
    if (!input.emailCode) return fail(400, 'EMAIL_CODE_REQUIRED', 'Email tasdiqlash kodi kerak');
    if (!(await verifyEmailCode(newEmail, input.emailCode))) return fail(400, 'EMAIL_CODE_INVALID', "Kod noto'g'ri yoki eskirgan");
  }

  // 2. Write: login address first (it can fail on its own), then the profile row.
  const db = createAdminClient();
  const updates: Record<string, string | boolean | null> = {};
  if (input.fullName) updates['full_name'] = input.fullName;
  if (input.preferredLocale) updates['preferred_locale'] = input.preferredLocale;
  if (newPhone) {
    updates['phone'] = newPhone;
    updates['phone_verified'] = smsOn;
  }
  if (newEmail !== undefined) {
    updates['email'] = newEmail;
    updates['email_verified'] = Boolean(newEmail) && emailOn;
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ success: true, user: session.profile });

  if (newPhone) {
    const { error } = await db.auth.admin.updateUserById(userId, { email: phoneToEmail(newPhone), email_confirm: true });
    if (error) return fail(409, 'PHONE_TAKEN', 'Bu raqam boshqa hisobga bog‘langan');
  }

  const { error } = await db.from('profiles').update(updates).eq('id', userId);
  if (error) {
    // Keep the login and the profile in step: undo the login change if the profile could not be saved.
    if (newPhone) await db.auth.admin.updateUserById(userId, { email: phoneToEmail(session.profile.phone), email_confirm: true });
    if (error.code === '23505') {
      return newEmail && !newPhone
        ? fail(409, 'EMAIL_TAKEN', 'Bu email boshqa hisobga bog‘langan')
        : fail(409, 'PHONE_TAKEN', 'Bu raqam boshqa hisobga bog‘langan');
    }
    return fail(500, 'SAVE_FAILED', 'Saqlab bo‘lmadi');
  }

  const fresh = (await loadSession(userId)) ?? session;
  return NextResponse.json({ success: true, user: fresh.profile });
}
