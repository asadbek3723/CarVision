import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserProfile, UserRole, SupportedLocale, PlanState } from '@/features/auth/types';
import type { CurrencyCode } from '@/domain/currency';

export interface ShopRow {
  id: string;
  shop_name: string;
  city: string;
  district: string;
  exact_address: string | null;
  phone: string;
  credits_balance: number;
  current_plan_code: string;
  plan_expires_at: string | null;
  is_verified: boolean;
}

/** Free plan is the default for everyone; only an unexpired paid plan counts as active. */
export function planStateOf(shop: ShopRow | null): PlanState {
  const code = shop?.current_plan_code ?? 'FREE_TRIAL';
  const expires = shop?.plan_expires_at ?? null;
  const isPaid = Boolean(shop) && code !== 'FREE_TRIAL' && Boolean(expires) && new Date(expires as string).getTime() > Date.now();
  return { code, isPaid, expiresAt: expires };
}

export interface Session {
  userId: string;
  role: UserRole;
  isBanned: boolean;
  /** Shop owned by the user (b2b_seller only). */
  shop: ShopRow | null;
  plan: PlanState;
  profile: UserProfile;
}

const CURRENCY_BY_LOCALE: Record<string, CurrencyCode> = {
  uz: 'UZS',
  ru: 'UZS',
  en: 'USD',
};

export async function loadSession(userId: string): Promise<Session | null> {
  const db = createAdminClient();

  // Independent lookups: run them together (one round trip instead of two).
  const [{ data: p }, { data: s }] = await Promise.all([
    db
      .from('profiles')
      .select('id, role, full_name, phone, preferred_locale, credits_balance, is_banned, created_at')
      .eq('id', userId)
      .maybeSingle(),
    db
      .from('shops')
      .select('id, shop_name, city, district, exact_address, phone, credits_balance, current_plan_code, plan_expires_at, is_verified')
      .eq('owner_id', userId)
      .maybeSingle(),
  ]);
  if (!p) return null;

  const shop: ShopRow | null = s ? (s as ShopRow) : null;

  const role = p.role as UserRole;
  const locale = (p.preferred_locale as SupportedLocale) || 'uz';

  const profile: UserProfile = {
    id: p.id as string,
    email: '',
    phone: p.phone as string,
    full_name: (p.full_name as string) || '',
    role,
    credits_balance: shop ? shop.credits_balance : (p.credits_balance as number),
    country: 'uz',
    preferred_language: locale,
    preferred_currency: CURRENCY_BY_LOCALE[locale] ?? 'USD',
    created_at: p.created_at as string,
    plan: planStateOf(shop),
    shop: shop
      ? {
          id: shop.id,
          shop_name: shop.shop_name,
          city: shop.city,
          district: shop.district,
          phone: shop.phone,
          address: shop.exact_address || `${shop.city}, ${shop.district}`,
        }
      : null,
  };

  return { userId, role, isBanned: Boolean(p.is_banned), shop, plan: planStateOf(shop), profile };
}

/** Returns the signed-in user's session, validated against Supabase Auth, or null. */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    const session = await loadSession(user.id);
    if (!session || session.isBanned) return null;
    return session;
  } catch {
    return null;
  }
}

/** True when the Supabase auth user carries the server-set super_admin role. */
export async function getSuperAdminId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return user.app_metadata?.['role'] === 'super_admin' ? user.id : null;
  } catch {
    return null;
  }
}
