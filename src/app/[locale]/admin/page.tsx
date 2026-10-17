'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AdminPinGate } from '@/components/admin/AdminPinGate';
import { AdminShell, type AdminTab } from '@/components/admin/AdminShell';
import { AdminOverviewView } from '@/components/admin/AdminOverviewView';
import { AdminStudiosView } from '@/components/admin/AdminStudiosView';
import { AdminEscrowView } from '@/components/admin/AdminEscrowView';
import { AdminLiveStreamView } from '@/components/admin/AdminLiveStreamView';
import { AdminUsersView } from '@/components/admin/AdminUsersView';
import { AdminSecurityView } from '@/components/admin/AdminSecurityView';
import { ShieldAlert, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function SuperAdminPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = React.useState<AdminTab>('dashboard');
  const [isPinVerified, setIsPinVerified] = React.useState<boolean | null>(null);

  // Check existing session token validity on mount
  React.useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/v1/admin/auth/status');
        const data = await res.json();
        if (isMounted) {
          setIsPinVerified(Boolean(data?.isAuthorized));
        }
      } catch {
        if (isMounted) {
          setIsPinVerified(false);
        }
      }
    };

    if (user?.role === 'super_admin') {
      checkStatus();
    } else {
      setIsPinVerified(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLockConsole = async () => {
    try {
      await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setIsPinVerified(false);
    }
  };

  // 1. Initial Auth Loading State
  if (isLoading || (user?.role === 'super_admin' && isPinVerified === null)) {
    return (
      <div className="min-h-screen bg-[#07080B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0F1117] border border-[#D4AE62]/20 flex items-center justify-center text-[#D4AE62] mb-4 shadow-[0_0_24px_rgba(212,174,98,0.2)]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-sm font-bold text-white tracking-wider uppercase">
          CarVision Xavfsizlik Tizimi Yuklanmoqda...
        </h2>
        <p className="text-xs text-[#94A3B8] mt-1">Super Admin ruxsatnomasi tekshirilmoqda</p>
      </div>
    );
  }

  // 2. Not Logged In or Not Super Admin -> High-Security Wall
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#07080B] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0B0C10] border border-rose-500/25 rounded-3xl p-8 sm:p-9 text-center shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] z-10 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 inline-block mb-2">
              403 Ruxsat Cheklangan
            </span>
            <h1 className="text-xl font-bold text-white">CarVision Admin Vault</h1>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              Ushbu maxfiy boshqaruv konsoliga kirish faqat tasdiqlangan Super Administrator hisoblariga beriladi. Tizimda siz oddiy foydalanuvchi sifatida ro‘yxatdan o‘tgansiz yoki tizimga kirmagansiz.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/seller"
              className="px-4 py-2.5 rounded-xl bg-[#141722] hover:bg-[#1E2333] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Orqaga Qaytish</span>
            </Link>

            <Link
              href="/login?redirect=/admin"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AE62] to-[#E5C378] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(212,174,98,0.25)]"
            >
              <Lock className="w-4 h-4" />
              <span>Admin Sifatida Kirish</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. User is Super Admin, but Master PIN is Not Verified -> Show Luxury PIN Gate
  if (!isPinVerified) {
    return (
      <AdminPinGate
        onSuccess={() => setIsPinVerified(true)}
        adminEmail={user.email}
      />
    );
  }

  // 4. Fully Authenticated and Verified -> Render World-Class Admin Shell
  return (
    <AdminShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLockConsole={handleLockConsole}
      adminEmail={user.email}
    >
      {activeTab === 'dashboard' && <AdminOverviewView />}
      {activeTab === 'studios' && <AdminStudiosView />}
      {activeTab === 'escrow' && <AdminEscrowView />}
      {activeTab === 'gpu-pipeline' && <AdminLiveStreamView />}
      {activeTab === 'devices' && <AdminUsersView />}
      {activeTab === 'security' && <AdminSecurityView />}
    </AdminShell>
  );
}
