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
  updateProfile: (updates: Partial<UserProfile>) => void;
}


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

  const signIn = React.useCallback(async (identifier: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Sign in failed' };
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
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
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      if (typeof document !== 'undefined' && data.user.preferred_language) {
        document.cookie = `NEXT_LOCALE=${data.user.preferred_language}; path=/; max-age=31536000; SameSite=Lax`;
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
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

  const updateProfile = React.useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: UserProfile = {
        ...prev,
        ...updates,
        shop: updates.shop !== undefined ? updates.shop : (prev.shop ?? null),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      if (updates.preferred_language && typeof document !== 'undefined') {
        document.cookie = `NEXT_LOCALE=${updates.preferred_language}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return updated;
    });
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
        updateProfile,
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
