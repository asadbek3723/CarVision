'use client';

import * as React from 'react';
import type { UserProfile, UserRole, SignUpPayload } from '../types';
import { createClient } from '@/lib/supabase/client';

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  signIn: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (payload: SignUpPayload) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchDemoProfile: (role: UserRole) => void;
}

export const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  b2b_seller: {
    id: 'a0000001-0000-0000-0000-000000000001',
    email: 'master@apexcustoms.uz',
    phone: '+998 90 123 45 67',
    full_name: 'Sanjar Usmonov (Apex Customs)',
    role: 'b2b_seller',
    credits_balance: 40,
    shop: {
      id: '7f8b919d-6484-4827-86c3-16279f6bb123',
      shop_name: 'Apex Customs Studio',
      city: 'Tashkent',
      district: 'Yunusobod',
      phone: '+998 90 123 45 67',
      address: 'Amir Temur ko‘chasi, 42',
    },
  },
  b2c_user: {
    id: 'a0000002-0000-0000-0000-000000000002',
    email: 'bobur.malibu@gmail.com',
    phone: '+998 97 765 43 21',
    full_name: 'Bobur Karimov',
    role: 'b2c_user',
    credits_balance: 5,
    shop: null,
  },
  super_admin: {
    id: 'a0000000-0000-0000-0000-000000000000',
    email: 'kursant410@gmail.com',
    phone: '+998 99 999 99 99',
    full_name: 'Chief Administrator',
    role: 'super_admin',
    credits_balance: 9999,
    shop: null,
  },
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'carvision_active_profile_v2';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const authModalMode: 'signin' | 'signup' = 'signin';

  // Load stored profile or sync with Supabase session on mount
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }

        // Check active Supabase auth session
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const role = (session.user.user_metadata?.['role'] as UserRole) || 'b2b_seller';
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email || 'user@carvision.uz',
              phone: session.user.phone || session.user.user_metadata?.['phone'] || '+998 90 000 00 00',
              full_name: session.user.user_metadata?.['full_name'] || 'Authenticated Master',
              role,
              credits_balance: Number(session.user.user_metadata?.['credits_balance'] ?? 40),
              shop: session.user.user_metadata?.['shop'] || null,
            };
            setUser(profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          }
        } catch {
          // Supabase offline or credentials pending
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const openAuthModal = React.useCallback((mode: 'signin' | 'signup' = 'signin') => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      const locale = parts[1] || 'uz';
      window.location.href = mode === 'signup' ? `/${locale}/register` : `/${locale}/login`;
    }
  }, []);

  const closeAuthModal = React.useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signIn = React.useCallback(async (identifier: string, _password?: string) => {
    setIsLoading(true);
    try {
      // 1. Check if user typed email matching any known profile or demo
      const idLower = identifier.toLowerCase().trim();
      let matched: UserProfile | null = null;

      if (idLower.includes('admin') || idLower.includes('kursant')) {
        matched = DEMO_PROFILES.super_admin;
      } else if (idLower.includes('owner') || idLower.includes('b2c') || idLower.includes('malibu')) {
        matched = DEMO_PROFILES.b2c_user;
      } else if (idLower.includes('apex') || idLower.includes('master') || idLower.includes('b2b') || idLower.includes('sanjar')) {
        matched = DEMO_PROFILES.b2b_seller;
      } else {
        // Create authenticated profile for the given email/phone
        const isShop = !idLower.includes('owner');
        matched = {
          id: `u-${Date.now()}`,
          email: idLower.includes('@') ? idLower : `${idLower}@carvision.uz`,
          phone: idLower.startsWith('+') ? idLower : `+998 ${idLower}`,
          full_name: isShop ? 'Verified Tuning Master' : 'Car Owner',
          role: isShop ? 'b2b_seller' : 'b2c_user',
          credits_balance: isShop ? 40 : 5,
          shop: isShop ? {
            id: `shop-${Date.now()}`,
            shop_name: 'Partner Workshop',
            city: 'Tashkent',
            district: 'Yunusobod',
          } : null,
        };
      }

      setUser(matched);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Sign in failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = React.useCallback(async (payload: SignUpPayload) => {
    setIsLoading(true);
    try {
      const newProfile: UserProfile = {
        id: `u-${Date.now()}`,
        email: payload.identifier.includes('@') ? payload.identifier : `${payload.identifier}@carvision.uz`,
        phone: payload.identifier.startsWith('+') ? payload.identifier : `+998 ${payload.identifier}`,
        full_name: payload.fullName || 'New Tuning Partner',
        role: payload.role,
        credits_balance: payload.role === 'b2b_seller' ? 40 : 10,
        shop: payload.role === 'b2b_seller' ? {
          id: `shop-${Date.now()}`,
          shop_name: payload.shopName || 'Customs Workshop',
          city: payload.city || 'Tashkent',
          district: payload.district || 'Yunusobod',
        } : null,
      };

      setUser(newProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }, []);

  const switchDemoProfile = React.useCallback((role: UserRole) => {
    const target = DEMO_PROFILES[role];
    setUser(target);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        switchDemoProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
