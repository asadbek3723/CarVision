import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { loadSession } from '@/server/auth/session';
import { isStrongEnoughPassword, normalizePhone, phoneToEmail } from '@/server/auth/phone';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { isSmsConfigured, verifyOtp } from '@/server/sms';
import { verifyTurnstile } from '@/server/turnstile';
import { deviceIdOf, recordTrialGrant, setDeviceCookie, shouldWithholdTrial } from '@/server/trial-guard';

const registerSchema = z
  .object({
    identifier: z.string().min(5).max(40),
    password: z.string().min(8).max(72),
    fullName: z.string().trim().min(2).max(100).optional(),
    role: z.enum(['b2c_user', 'b2b_seller']),
    country: z.string().max(60).optional(),
    preferredLanguage: z.enum(['uz', 'en', 'ru', 'ar', 'tr', 'kk', 'ky', 'tg']).optional(),
    preferredCurrency: z.string().max(8).optional(),
    shopName: z.string().trim().max(150).optional(),
    city: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional(),
    referralCode: z.string().max(32).optional(),
    otpCode: z.string().regex(/^\d{6}$/).optional(),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS_PER_IP = 8;
const FREE_CREDITS = 40;

/** Pre-migration path: balance + ledger row as before (two writes, not one transaction). */
async function legacyTrialGrant(db: ReturnType<typeof createAdminClient>, userId: string, seller: boolean): Promise<boolean> {
  let shopId: string | null = null;
  if (seller) {
    const { data: shop } = await db.from('shops').update({ credits_balance: FREE_CREDITS }).eq('owner_id', userId).select('id').maybeSingle();
    shopId = (shop?.id as string | undefined) ?? null;
    if (!shopId) return false;
  } else {
    const { error } = await db.from('profiles').update({ credits_balance: FREE_CREDITS }).eq('id', userId);
    if (error) return false;
  }
  const { error: ledgerErr } = await db.from('credit_ledger').insert({
    user_id: userId,
    shop_id: shopId,
    amount: FREE_CREDITS,
    balance_after: FREE_CREDITS,
    action_type: 'TRIAL_BONUS',
    description: 'Free plan credits on sign-up',
  });
  if (ledgerErr) console.error('sign-up ledger insert failed:', ledgerErr.message);
  return true;
}

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ success: false, code, error }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, 'INVALID_INPUT', "Ma'lumotlar noto'g'ri kiritildi");
    const payload = parsed.data;

    const phone = normalizePhone(payload.identifier);
    if (!phone) return fail(400, 'INVALID_PHONE', "Telefon raqam noto'g'ri");
    if (!isStrongEnoughPassword(payload.password)) {
      return fail(400, 'WEAK_PASSWORD', "Parol kamida 8 belgi bo'lib, harf va raqam bo'lishi kerak");
    }

    const ip = clientIp(request);
    const recent = await recentFailures('ip', ip, 'register', REGISTER_WINDOW_MS, true);
    if (recent >= MAX_REGISTRATIONS_PER_IP) {
      return fail(429, 'RATE_LIMITED', "Juda ko'p urinish. Keyinroq qayta urinib ko'ring");
    }

    // Bots: Cloudflare Turnstile (only enforced when TURNSTILE_SECRET_KEY is configured).
    if (!(await verifyTurnstile(payload.turnstileToken, ip))) {
      return fail(400, 'CAPTCHA_FAILED', "Tekshiruvdan o'tilmadi. Sahifani yangilab qayta urinib ko'ring");
    }

    const smsOn = isSmsConfigured();
    if (smsOn) {
      if (!payload.otpCode) return fail(400, 'OTP_REQUIRED', 'SMS tasdiqlash kodi kerak');
      if (!(await verifyOtp(phone, payload.otpCode))) {
        return fail(400, 'OTP_INVALID', "Tasdiqlash kodi noto'g'ri yoki eskirgan");
      }
    }

    const db = createAdminClient();
    const locale = payload.preferredLanguage ?? 'uz';
    const fullName = payload.fullName || (payload.role === 'b2b_seller' ? 'Usta' : 'Mijoz');

    // 1. Auth user. app_metadata is server-only, so the role can never be self-assigned.
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: phoneToEmail(phone),
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
      app_metadata: { role: payload.role },
    });
    if (createErr || !created.user) {
      const taken = /already|registered|exists/i.test(createErr?.message ?? '');
      return taken
        ? fail(409, 'PHONE_TAKEN', "Bu telefon raqam bilan akkaunt mavjud. Tizimga kiring")
        : fail(500, 'CREATE_FAILED', "Akkaunt yaratib bo'lmadi");
    }
    const userId = created.user.id;

    const cleanup = async () => {
      await db.from('shops').delete().eq('owner_id', userId);
      await db.from('profiles').delete().eq('id', userId);
      await db.auth.admin.deleteUser(userId);
    };

    // 2. Profile
    const { error: profileErr } = await db.from('profiles').insert({
      id: userId,
      role: payload.role,
      full_name: fullName,
      phone,
      preferred_locale: locale,
      // Credits arrive only through grant_trial_credits below (balance + ledger in one transaction).
      credits_balance: 0,
      phone_verified: smsOn,
    });
    if (profileErr) {
      await cleanup();
      return fail(500, 'PROFILE_FAILED', "Profil yaratib bo'lmadi");
    }

    // 3. Shop for b2b sellers
    if (payload.role === 'b2b_seller') {
      const { data: shop, error: shopErr } = await db
        .from('shops')
        .insert({
          owner_id: userId,
          shop_name: payload.shopName || 'Tuning studiya',
          city: payload.city || 'Toshkent',
          district: payload.district || '-',
          phone,
          current_plan_code: 'FREE_TRIAL',
          credits_balance: 0,
          // New workshops are listed and can sell only after an admin verifies them.
          is_verified: false,
          watermark_enabled: true,
          max_devices: 1,
          referral_code: crypto.randomBytes(5).toString('hex').toUpperCase(),
        })
        .select('id')
        .single();
      if (shopErr || !shop) {
        await cleanup();
        return fail(500, 'SHOP_FAILED', "Studiya yaratib bo'lmadi");
      }
    }

    // Free sign-up credits: held back when this network / device already received them several
    // times (credit farming). A verified phone (SMS) always gets them.
    const device = deviceIdOf(request);
    const withhold = smsOn ? false : await shouldWithholdTrial(ip, device.id);
    const { data: grant, error: grantErr } = await db.rpc('grant_trial_credits', {
      p_user_id: userId,
      p_amount: FREE_CREDITS,
      p_withhold: withhold,
    });
    let granted = (grant as { granted?: boolean } | null)?.granted === true;
    if (grantErr) {
      console.error('grant_trial_credits failed:', grantErr.message);
      // The 20261120 migration is not applied yet: grant the old way so new accounts are not left empty.
      if (!withhold && /grant_trial_credits|PGRST202|does not exist/i.test(`${grantErr.code ?? ''} ${grantErr.message}`)) {
        granted = await legacyTrialGrant(db, userId, payload.role === 'b2b_seller');
      }
    }
    if (granted) await recordTrialGrant(ip, device.id);

    await recordAttempt('register', phone, ip, true);

    // 4. Sign in so the session cookie is set by the server
    const supabase = await createServerSupabaseClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: payload.password,
    });
    if (signInErr) return fail(500, 'SIGNIN_FAILED', "Akkaunt yaratildi, lekin kirishda xatolik. Qayta kiring");

    const session = await loadSession(userId);
    const response = NextResponse.json({ success: true, user: session?.profile, trialWithheld: withhold });
    if (device.fresh) setDeviceCookie(response, device.id);
    return response;
  } catch (err) {
    console.error('Register error:', err);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
}
