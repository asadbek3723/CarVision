import type { CurrencyCode } from '@/domain/currency';

export type UserRole = 'b2b_seller' | 'b2c_user' | 'super_admin';

export interface ShopData {
  id: string;
  shop_name: string;
  city: string;
  district: string;
  phone?: string;
  address?: string;
}

export type SupportedLocale = 'uz' | 'ru' | 'en' | 'ar' | 'tr' | 'kk' | 'ky' | 'tg';

export interface PlanState {
  code: string;
  /** true only for an active (not expired) paid plan: unlocks Garage and Dashboard */
  isPaid: boolean;
  expiresAt: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
  credits_balance: number;
  country?: string;
  preferred_language?: SupportedLocale;
  preferred_currency?: CurrencyCode;
  shop?: ShopData | null;
  plan?: PlanState;
  created_at?: string;
}

export interface SignUpPayload {
  identifier: string; // phone or email
  password?: string | undefined;
  role: UserRole;
  fullName: string;
  country?: string | undefined;
  preferredLanguage?: SupportedLocale | undefined;
  preferredCurrency?: CurrencyCode | undefined;
  shopName?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  referralCode?: string | undefined;
}
