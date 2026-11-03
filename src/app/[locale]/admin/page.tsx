'use client';

import * as React from 'react';
import { ArrowLeft, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AdminPinGate } from '@/components/admin/AdminPinGate';
import { AdminApp } from '@/components/admin/AdminApp';

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#07080B] p-6 text-center">{children}</div>;
}

export default function SuperAdminPage() {
  const { user, isLoading } = useAuth();
  const [verified, setVerified] = React.useState<boolean | null>(null);
  const isAdmin = user?.role === 'super_admin';

  // Is there already a valid PIN session?
  React.useEffect(() => {
    if (!isAdmin) {
      setVerified(false);
      return;
    }
    let cancelled = false;
    fetch('/api/v1/admin/auth/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => !cancelled && setVerified(Boolean(d?.isAuthorized)))
      .catch(() => !cancelled && setVerified(false));
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const lock = React.useCallback(async () => {
    try {
      await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    } finally {
      setVerified(false);
    }
  }, []);

  if (isLoading || (isAdmin && verified === null)) {
    return (
      <Centered>
        <Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" />
        <p className="mt-3 text-sm text-white/50">Tekshirilmoqda…</p>
      </Centered>
    );
  }

  if (!isAdmin) {
    return (
      <Centered>
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-300"><ShieldAlert className="h-8 w-8" /></span>
        <h1 className="mt-5 text-xl font-bold text-white">Ruxsat yo‘q</h1>
        <p className="mt-2 max-w-xs text-sm text-white/50">{user ? 'Bu bo‘lim faqat administratorlar uchun.' : 'Admin akkaunti bilan tizimga kiring.'}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/seller" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            Orqaga
          </Link>
          {!user && (
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AE62] px-6 py-3 text-sm font-bold text-black">
              <Lock className="h-4 w-4" />
              Kirish
            </Link>
          )}
        </div>
      </Centered>
    );
  }

  const name = user.full_name || user.phone;

  if (!verified) return <AdminPinGate adminName={name} onSuccess={() => setVerified(true)} />;

  return <AdminApp adminName={name} onExpired={() => setVerified(false)} onLock={lock} />;
}
