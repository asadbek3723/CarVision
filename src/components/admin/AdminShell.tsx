'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Banknote, Cpu, LayoutDashboard, Lock, Shield, ShieldCheck, Store, Users } from 'lucide-react';
import { Link } from '@/i18n/routing';

export type AdminTab = 'dashboard' | 'shops' | 'escrow' | 'users' | 'renders' | 'security';

const NAV: Array<{ id: AdminTab; label: string; short: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'dashboard', short: 'sDashboard', icon: LayoutDashboard },
  { id: 'shops', label: 'shops', short: 'sShops', icon: Store },
  { id: 'escrow', label: 'escrow', short: 'sEscrow', icon: Banknote },
  { id: 'users', label: 'users', short: 'sUsers', icon: Users },
  { id: 'renders', label: 'renders', short: 'sRenders', icon: Cpu },
  { id: 'security', label: 'security', short: 'sSecurity', icon: ShieldCheck },
];

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLock: () => void;
  adminName: string;
  pendingDeposits: number;
  children: React.ReactNode;
}

export function AdminShell({ activeTab, onTabChange, onLock, adminName, pendingDeposits, children }: Props) {
  const t = useTranslations('adm.nav');
  const active = NAV.find((n) => n.id === activeTab) ?? NAV[0]!;

  return (
    <div className="min-h-screen bg-[#07080B] text-white md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-[#0B0C10] p-4 md:flex">
        <div>
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4AE62]/15 text-[#D4AE62]"><Shield className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold tracking-wider">CARVISION</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D4AE62]">Admin</p>
            </div>
          </div>
          <nav className="mt-6 space-y-1" aria-label={t('sections')}>
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onTabChange(n.id)}
                aria-current={activeTab === n.id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start text-sm font-semibold transition ${activeTab === n.id ? 'bg-[#D4AE62]/15 text-[#D4AE62]' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}
              >
                <n.icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{t(n.label)}</span>
                {n.id === 'escrow' && pendingDeposits > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-black">{pendingDeposits}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="space-y-2">
          <Link href="/seller" className="block rounded-2xl px-4 py-3 text-sm text-white/55 hover:bg-white/[0.05] hover:text-white">{t('backToApp')}</Link>
          <div className="rounded-2xl bg-white/[0.04] p-3">
            <p className="truncate text-xs text-white/50">{adminName}</p>
            <button type="button" onClick={onLock} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/15">
              <Lock className="h-3.5 w-3.5" />
              {t('lock')}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#07080B]/90 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4AE62]/15 text-[#D4AE62]"><active.icon className="h-[18px] w-[18px]" /></span>
            <span className="truncate text-sm font-bold">{t(active.label)}</span>
          </div>
          <button type="button" onClick={onLock} aria-label={t('lock')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
            <Lock className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 bg-[#0B0C10]/95 px-1 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl md:hidden" aria-label={t('sections')}>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onTabChange(n.id)}
            aria-current={activeTab === n.id ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition ${activeTab === n.id ? 'text-[#D4AE62]' : 'text-white/50'}`}
          >
            <span className="relative">
              <n.icon className="h-5 w-5" />
              {n.id === 'escrow' && pendingDeposits > 0 && <span className="absolute -end-2 -top-1.5 min-w-4 rounded-full bg-amber-400 px-1 text-center text-[9px] font-bold leading-4 text-black">{pendingDeposits}</span>}
            </span>
            {t(n.short)}
          </button>
        ))}
      </nav>
    </div>
  );
}
