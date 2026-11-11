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

const PROFILE_COLUMNS = 'id, role, full_name, phone, phone_verified, email, email_verified, preferred_locale, credits_balance, is_banned, created_at';
// Before the profile_contacts migration is applied the e-mail columns do not exist; sign-in must keep working.
const PROFILE_COLUMNS_LEGACY = 'id, role, full_name, phone, phone_verified, preferred_locale, credits_balance, is_banned, created_at';

async function loadProfileRow(userId: string): Promise<Record<string, unknown> | null> {
  const db = createAdminClient();
  const first = await db.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (!first.error) return (first.data as Record<string, unknown> | null) ?? null;
  if (first.error.code !== '42703') return null; // 42703 = undefined column
  const legacy = await db.from('profiles').select(PROFILE_COLUMNS_LEGACY).eq('id', userId).maybeSingle();
  return (legacy.data as Record<string, unknown> | null) ?? null;
}

/** `avatarUrl` is the profile photo kept in the Supabase Auth user's metadata (the caller already has it). */
export async function loadSession(userId: string, avatarUrl?: string | null): Promise<Session | null> {
  const db = createAdminClient();

  // Independent lookups: run them together (one round trip instead of two).
  const [p, { data: s }] = await Promise.all([
    loadProfileRow(userId),
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
    email: (p['email'] as string | null | undefined) ?? '',
    email_verified: p['email_verified'] === true,
    phone: p['phone'] as string,
    phone_verified: p['phone_verified'] === true,
    full_name: (p.full_name as string) || '',
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
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
          verified: Boolean(shop.is_verified),
        }
      : null,
  };

  return { userId, role, isBanned: Boolean(p.is_banned), shop, plan: planStateOf(shop), profile };
}

export type SessionLookup = { status: 'ok'; session: Session } | { status: 'none' } | { status: 'unavailable' };

/**
 * Like getSession(), but tells "nobody is signed in" apart from "could not check right now"
 * (Supabase slow / unreachable, a token refresh racing another request). Only the first may sign
 * the user out; the second must keep them signed in and simply be retried later.
 */
export async function lookupSession(): Promise<SessionLookup> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      // Network failures and 5xx from Supabase Auth are temporary; missing / invalid sessions are not.
      const status = (error as { status?: number }).status ?? 0;
      const temporary = error.name === 'AuthRetryableFetchError' || status === 0 || status >= 500 || status === 429;
      return temporary && error.name !== 'AuthSessionMissingError' ? { status: 'unavailable' } : { status: 'none' };
    }
    if (!user) return { status: 'none' };
    const meta = user.user_metadata?.['avatar_url'];
    const session = await loadSession(user.id, typeof meta === 'string' ? meta : null);
    if (!session) return { status: 'unavailable' };
    if (session.isBanned) return { status: 'none' };
    return { status: 'ok', session };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Returns the signed-in user's session, validated against Supabase Auth, or null. */
export async function getSession(): Promise<Session | null> {
  const r = await lookupSession();
  return r.status === 'ok' ? r.session : null;
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
