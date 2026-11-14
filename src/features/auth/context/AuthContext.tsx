'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile, SignUpPayload } from '../types';

/** `code` is the server error code, or NETWORK / SERVER when no usable answer arrived. */
export interface AuthResult {
  success: boolean;
  error?: string;
  code?: string;
}

async function readAuthResponse(res: Response): Promise<{ ok: boolean; data: Record<string, unknown>; code: string }> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const ok = res.ok && data['success'] === true;
  const code = typeof data['code'] === 'string' ? (data['code'] as string) : res.status >= 500 ? 'SERVER' : 'UNKNOWN';
  return { ok, data, code };
}

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  signIn: (identifier: string, password?: string) => Promise<AuthResult>;
  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
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
        let wasSignedIn = false;
        try {
          wasSignedIn = Boolean(localStorage.getItem(STORAGE_KEY));
        } catch {
          // storage blocked: treat as a guest
        }
        if (!wasSignedIn) {
          // A guest: nothing to keep and no reason to wait. The dead-cookie cleanup runs once per
          // browser session, not on every page (it cost every visitor 1.2s and two extra requests).
          setUser(null);
          let cleaned = false;
          try {
            cleaned = sessionStorage.getItem('carvision_guest_cleanup') === '1';
            sessionStorage.setItem('carvision_guest_cleanup', '1');
          } catch {
            // storage blocked: clean up below
          }
          if (!cleaned) void fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
          return;
        }
        // One 401 is not proof of a sign-out (a token refresh can race another request): ask once
        // more before dropping the user. Anything else (503, offline) keeps them signed in.
        await new Promise((r) => setTimeout(r, 1200));
        const again = await fetch('/api/v1/auth/me', { cache: 'no-store' }).catch(() => null);
        if (again?.ok) {
          const data = await again.json().catch(() => null);
          if (data?.success && data.user) {
            setUser(data.user);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
          }
          return;
        }
        if (again?.status === 401) {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          // Drop the dead session cookies too, so the server no longer treats this browser as
          // signed in (it skips the landing page for signed-in visitors).
          void fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
        }
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

  // A soft navigation (no page reload) to the sign-in / sign-up screen.
  const router = useRouter();
  const openAuthModal = React.useCallback(
    (mode: 'signin' | 'signup' = 'signin') => {
      if (typeof window !== 'undefined') {
        const parts = window.location.pathname.split('/');
        const locale = parts[1] || 'uz';
        router.push(mode === 'signup' ? `/${locale}/register` : `/${locale}/login`);
      }
    },
    [router]
  );

  const closeAuthModal = React.useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // NOTE: no global isLoading toggle here — it re-rendered the whole tree and made failed
  // sign-ins look like a page refresh. The forms keep their own loading state.
  const signIn = React.useCallback(async (identifier: string, password?: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const { ok, data, code } = await readAuthResponse(res);
      if (!ok) {
        return { success: false, code, ...(typeof data['error'] === 'string' ? { error: data['error'] as string } : {}) };
      }
      const user = data['user'] as UserProfile;
      setUser(user);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch {
        // private mode / storage full: the server cookie is the source of truth
      }
      return { success: true };
    } catch {
      return { success: false, code: 'NETWORK' };
    }
  }, []);

  const signUp = React.useCallback(async (payload: SignUpPayload): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { ok, data, code } = await readAuthResponse(res);
      if (!ok) {
        return { success: false, code, ...(typeof data['error'] === 'string' ? { error: data['error'] as string } : {}) };
      }
      const user = data['user'] as UserProfile | undefined;
      if (user) {
        if (typeof document !== 'undefined' && user.preferred_language) {
          document.cookie = `NEXT_LOCALE=${user.preferred_language}; path=/; max-age=31536000; SameSite=Lax`;
        }
        setUser(user);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } catch {
          // ignore
        }
      }
      return { success: true };
    } catch {
      return { success: false, code: 'NETWORK' };
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
