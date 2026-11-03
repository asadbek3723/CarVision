'use client';

import * as React from 'react';
import type { UserProfile, SignUpPayload } from '../types';

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
  /** Re-reads the profile (credits, plan) from the server. */
  refreshProfile: () => Promise<void>;
}


const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'carvision_active_profile_v2';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const authModalMode: 'signin' | 'signup' = 'signin';

  // The server session cookie is the single source of truth. The cached copy is only
  // used to avoid a flash of the signed-out UI and is replaced as soon as /me answers.
  const refreshProfile = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
          return;
        }
      }
      if (res.status === 401) {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Offline: keep the cached profile
    }
  }, []);

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) setUser(JSON.parse(cached));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
        await refreshProfile();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshProfile]);

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
      await fetch('/api/v1/auth/logout', { method: 'POST' });
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
        refreshProfile,
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
