import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { loadSession } from '@/server/auth/session';
import { isStrongEnoughPassword, normalizePhone, phoneToEmail } from '@/server/auth/phone';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { isSmsConfigured, verifyOtp } from '@/server/sms';

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
  })
  .strict();

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS_PER_IP = 8;
const FREE_CREDITS = 40;

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
      credits_balance: FREE_CREDITS,
      phone_verified: smsOn,
    });
    if (profileErr) {
      await cleanup();
      return fail(500, 'PROFILE_FAILED', "Profil yaratib bo'lmadi");
    }

    // 3. Shop for b2b sellers
    let shopId: string | null = null;
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
          credits_balance: FREE_CREDITS,
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
      shopId = shop.id as string;
    }

    await db.from('credit_ledger').insert({
      user_id: userId,
      shop_id: shopId,
      amount: FREE_CREDITS,
      balance_after: FREE_CREDITS,
      action_type: 'TRIAL_BONUS',
      description: 'Free plan credits on sign-up',
    });

    await recordAttempt('register', phone, ip, true);

    // 4. Sign in so the session cookie is set by the server
    const supabase = await createServerSupabaseClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: payload.password,
    });
    if (signInErr) return fail(500, 'SIGNIN_FAILED', "Akkaunt yaratildi, lekin kirishda xatolik. Qayta kiring");

    const session = await loadSession(userId);
    return NextResponse.json({ success: true, user: session?.profile });
  } catch (err) {
    console.error('Register error:', err);
    return fail(500, 'INTERNAL', 'Serverda xatolik yuz berdi');
  }
}
