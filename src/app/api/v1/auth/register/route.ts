import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/features/auth/types';

const registerSchema = z.object({
  identifier: z.string().min(1),
  fullName: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(['b2c_user', 'b2b_seller']),
  country: z.string().optional(),
  preferredLanguage: z.enum(['uz', 'ru', 'en']).optional(),
  preferredCurrency: z.string().optional(),
  shopName: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration parameters' },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const cleanId = payload.identifier.trim();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const phoneWithPlus = cleanDigits.startsWith('998')
      ? `+${cleanDigits}`
      : `+998${cleanDigits}`;

    const countryRaw = payload.country || "O'zbekiston";
    const isRuCountry =
      countryRaw.includes('Rossiya') || countryRaw.includes('Qozog') || countryRaw.includes('Qirg');
    const isEnCountry =
      countryRaw.includes('AQSH') || countryRaw.includes('BAA') || countryRaw.includes('Buyuk');
    const detectedLang = payload.preferredLanguage || (isRuCountry ? 'ru' : isEnCountry ? 'en' : 'uz');
    const detectedCurr =
      payload.preferredCurrency ||
      (countryRaw.includes('Rossiya')
        ? 'RUB'
        : countryRaw.includes('BAA')
        ? 'AED'
        : countryRaw.includes('Turkiya')
        ? 'TRY'
        : countryRaw.includes('AQSH')
        ? 'USD'
        : countryRaw.includes('Qozog')
        ? 'KZT'
        : countryRaw.includes('Qirg')
        ? 'KGS'
        : 'UZS');

    const supabase = createAdminClient();

    const userId = crypto.randomUUID();
    const userLogin = `u_${cleanDigits.slice(-7) || Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Insert user into Supabase users table
    const { error: userInsertError } = await supabase.from('users').insert({
      id: userId,
      login: userLogin,
      name: payload.fullName || (payload.role === 'b2b_seller' ? 'Tuning Studio Master' : 'Car Owner'),
      phone: phoneWithPlus,
      role: payload.role === 'b2b_seller' ? 'seller' : 'user',
      is_active: true,
    });

    if (userInsertError) {
      console.warn('Supabase users insert error:', userInsertError);
    }

    // 2. If b2b_seller, insert studio into Supabase sellers table
    let shopData = null;
    if (payload.role === 'b2b_seller') {
      const sellerId = crypto.randomUUID();
      const shopName = payload.shopName || 'Customs Studio';
      const address = `${payload.city || 'Tashkent'}, ${payload.district || 'Yunusobod'}`;

      const { error: sellerInsertError } = await supabase.from('sellers').insert({
        id: sellerId,
        user_id: userId,
        business_name: shopName,
        phone: phoneWithPlus,
        address,
        credits: 40,
        verified: true,
        description: `${shopName} — premium car tuning and 4K studio visualizer partner.`,
      });

      if (sellerInsertError) {
        console.warn('Supabase sellers insert error:', sellerInsertError);
      }

      shopData = {
        id: sellerId,
        shop_name: shopName,
        city: payload.city || 'Tashkent',
        district: payload.district || 'Yunusobod',
        phone: phoneWithPlus,
        address,
      };
    }

    const createdProfile: UserProfile = {
      id: userId,
      email: `${userLogin}@carvision.uz`,
      phone: phoneWithPlus,
      full_name: payload.fullName || (payload.role === 'b2b_seller' ? 'Tuning Studio Master' : 'Car Owner'),
      role: payload.role,
      credits_balance: payload.role === 'b2b_seller' ? 40 : 10,
      country: countryRaw,
      preferred_language: detectedLang,
      preferred_currency: detectedCurr,
      shop: shopData,
    };

    return NextResponse.json({ success: true, user: createdProfile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
