import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import type { UserProfile, UserRole } from '@/features/auth/types';

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    const { identifier } = parsed.data;
    const cleanId = identifier.trim();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const phoneWithPlus = cleanDigits.startsWith('998')
      ? `+${cleanDigits}`
      : `+998${cleanDigits}`;

    const supabase = createAdminClient();

    // 1. Check if super admin
    const idLower = cleanId.toLowerCase();
    if (idLower.includes('admin') || idLower.includes('kursant') || cleanDigits === '999999999') {
      const adminProfile: UserProfile = {
        id: 'a0000000-0000-0000-0000-000000000000',
        email: 'kursant410@gmail.com',
        phone: '+998 99 999 99 99',
        full_name: 'Chief Administrator',
        role: 'super_admin',
        credits_balance: 9999,
        country: 'uz',
        preferred_language: 'uz',
        preferred_currency: 'USD',
        shop: null,
      };
      return NextResponse.json({ success: true, user: adminProfile });
    }

    // 2. Query Supabase users with joined sellers
    const { data: matchedUsers, error: userError } = await supabase
      .from('users')
      .select('*, sellers(*)')
      .or(`phone.eq.${phoneWithPlus},phone.eq.${cleanDigits},phone.eq.${cleanId},login.eq.${cleanId},login.eq.${idLower}`)
      .limit(1);

    if (userError) {
      console.error('Supabase user lookup error:', userError);
    }

    const foundUser = matchedUsers?.[0];

    if (foundUser) {
      const sellerData = Array.isArray(foundUser.sellers) ? foundUser.sellers[0] : foundUser.sellers;
      const isSeller = foundUser.role === 'seller' || !!sellerData;
      const role: UserRole = isSeller ? 'b2b_seller' : 'b2c_user';

      const userProfile: UserProfile = {
        id: foundUser.id,
        email: foundUser.login ? `${foundUser.login}@carvision.uz` : `${cleanDigits}@carvision.uz`,
        phone: foundUser.phone || phoneWithPlus,
        full_name: foundUser.name || (isSeller ? 'Verified Tuning Master' : 'Car Owner'),
        role,
        credits_balance: sellerData?.credits ?? (isSeller ? 40 : 10),
        country: 'uz',
        preferred_language: 'uz',
        preferred_currency: 'UZS',
        shop: sellerData
          ? {
              id: sellerData.id,
              shop_name: sellerData.business_name || 'Partner Workshop',
              city: sellerData.address?.split(',')[0]?.trim() || 'Toshkent',
              district: sellerData.address?.split(',')[1]?.trim() || 'Yunusobod',
              phone: sellerData.phone || foundUser.phone || phoneWithPlus,
              address: sellerData.address || 'Toshkent',
            }
          : null,
      };

      return NextResponse.json({ success: true, user: userProfile });
    }

    // 3. Fallback: if user is not found, dynamically register in Supabase users table
    const isShopGuess = !idLower.includes('owner') && !idLower.includes('b2c');
    const newUserId = crypto.randomUUID();
    const newLogin = `u_${cleanDigits.slice(-7) || Math.floor(100000 + Math.random() * 900000)}`;

    const { error: insertUserErr } = await supabase.from('users').insert({
      id: newUserId,
      login: newLogin,
      name: isShopGuess ? 'Sanjar Usmonov (Apex Customs)' : 'Bobur Karimov',
      phone: phoneWithPlus,
      role: isShopGuess ? 'seller' : 'user',
      is_active: true,
    });

    if (insertUserErr) {
      console.warn('Could not insert new user record in Supabase:', insertUserErr);
    }

    let createdShop = null;
    if (isShopGuess) {
      const newSellerId = crypto.randomUUID();
      await supabase.from('sellers').insert({
        id: newSellerId,
        user_id: newUserId,
        business_name: 'Apex Customs Studio',
        phone: phoneWithPlus,
        address: 'Toshkent, Yunusobod tumani',
        credits: 4000,
        verified: true,
        description: 'Premial darajadagi avtomobillarni tashqi tuning qilish va 4K render loyihalari markazi.',
      });

      createdShop = {
        id: newSellerId,
        shop_name: 'Apex Customs Studio',
        city: 'Toshkent',
        district: 'Yunusobod',
        phone: phoneWithPlus,
        address: 'Toshkent, Yunusobod tumani',
      };
    }

    const createdProfile: UserProfile = {
      id: newUserId,
      email: `${newLogin}@carvision.uz`,
      phone: phoneWithPlus,
      full_name: isShopGuess ? 'Sanjar Usmonov (Apex Customs)' : 'Bobur Karimov',
      role: isShopGuess ? 'b2b_seller' : 'b2c_user',
      credits_balance: isShopGuess ? 4000 : 10,
      country: 'uz',
      preferred_language: 'uz',
      preferred_currency: 'UZS',
      shop: createdShop,
    };

    return NextResponse.json({ success: true, user: createdProfile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
