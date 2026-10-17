export type UserRole = 'b2b_seller' | 'b2c_user' | 'super_admin';

export interface ShopData {
  id: string;
  shop_name: string;
  city: string;
  district: string;
  phone?: string;
  address?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
  credits_balance: number;
  shop?: ShopData | null;
  created_at?: string;
}

export interface SignUpPayload {
  identifier: string; // phone or email
  password?: string | undefined;
  role: UserRole;
  fullName: string;
  shopName?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  referralCode?: string | undefined;
}
