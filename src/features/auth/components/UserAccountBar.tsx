'use client';

import * as React from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  User,
  Building2,
  ShieldCheck,
  Zap,
  LogOut,
  ChevronDown,
  Layers,
  Store,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';
import { playLock } from '@/features/camera/lib/fx';

export interface UserAccountBarProps {
  className?: string;
}

export function UserAccountBar({ className }: UserAccountBarProps) {
  const { user, signOut, switchDemoProfile } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const params = useParams();
  const locale = (params['locale'] as string) || 'en';

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className={cn('flex items-center gap-2 select-none', className)}>
        <Link
          href={`/${locale}/login`}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/10 hover:bg-gold/20 border border-gold/30 text-xs font-semibold text-gold transition-all active:scale-95 cursor-pointer shadow-lg hover:border-gold/60"
        >
          <User className="w-3.5 h-3.5 text-gold" />
          <span>Kirish / Ro‘yxatdan o‘tish</span>
        </Link>
      </div>
    );
  }

  const isB2B = user.role === 'b2b_seller';
  const isAdmin = user.role === 'super_admin';

  let roleLabel = 'Mijoz (B2C)';
  let roleBadgeClass = 'bg-[#00E599]/15 border-[#00E599]/40 text-[#00E599]';
  let RoleIcon = User;

  if (isB2B) {
    roleLabel = 'Usta (B2B)';
    roleBadgeClass = 'bg-[#19D3FF]/15 border-[#19D3FF]/40 text-[#19D3FF]';
    RoleIcon = Building2;
  } else if (isAdmin) {
    roleLabel = 'Super Admin';
    roleBadgeClass = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    RoleIcon = ShieldCheck;
  }

  const displayName = isB2B && user.shop ? user.shop.shop_name : user.full_name;

  return (
    <div ref={dropdownRef} className={cn('relative select-none', className)}>
      {/* Account Capsule Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#12141A]/90 hover:bg-[#181B22] border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-xl backdrop-blur-md active:scale-95"
      >
        <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', roleBadgeClass)}>
          <RoleIcon className="w-3 h-3" />
          <span>{roleLabel}</span>
        </span>

        <span className="text-xs font-semibold text-white max-w-[130px] truncate">
          {displayName}
        </span>

        <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#19D3FF] bg-[#19D3FF]/10 px-2 py-0.5 rounded-full border border-[#19D3FF]/20">
          <Zap className="w-3 h-3 fill-current" />
          <span>{user.credits_balance}</span>
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          className="absolute top-full end-0 mt-2 w-72 rounded-2xl bg-[#0D0F15] border border-white/10 p-3 shadow-2xl shadow-black/80 z-50 backdrop-blur-2xl animate-fade-in"
          style={{
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Identity Header */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 mb-2">
            <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
            <p className="text-[11px] text-[#94A3B8] font-mono truncate">{user.email || user.phone}</p>
            {user.shop && (
              <p className="text-[11px] text-[#19D3FF] font-semibold mt-1">
                🏢 {user.shop.shop_name} ({user.shop.district})
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5">
              <span className="text-[#94A3B8]">Mavjud balans:</span>
              <span className="font-mono font-bold text-[#19D3FF]">{user.credits_balance} Generatsiya krediti</span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-1 mb-2">
            <Link
              href={`/${locale}/studio`}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors"
            >
              <Layers className="w-4 h-4 text-[#19D3FF]" />
              <span>Tuning Studio (4K Visualizer)</span>
            </Link>

            {(isB2B || isAdmin) && (
              <Link
                href={`/${locale}/seller`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors"
              >
                <Store className="w-4 h-4 text-[#19D3FF]" />
                <span>Ustaxona Paneli (Ombor &amp; Zakalat)</span>
              </Link>
            )}

            <Link
              href={`/${locale}/marketplace`}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#00E599]" />
              <span>Ehtiyot Qismlar Katalogi</span>
            </Link>

            {isAdmin && (
              <Link
                href={`/${locale}/admin`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Super Admin Paneli</span>
              </Link>
            )}
          </div>

          {/* Switch Profile Shortcuts */}
          <div className="pt-2 border-t border-white/10 mb-2">
            <p className="text-[10px] uppercase font-bold text-[#94A3B8] px-2 mb-1.5">
              Rolni almashtirish (Demo)
            </p>
            <div className="grid grid-cols-3 gap-1 px-1">
              <button
                type="button"
                onClick={() => {
                  playLock();
                  switchDemoProfile('b2b_seller');
                  setDropdownOpen(false);
                }}
                className={cn(
                  'py-1 text-[10px] font-bold rounded-lg border text-center transition-colors cursor-pointer',
                  isB2B ? 'border-[#19D3FF] bg-[#19D3FF]/20 text-[#19D3FF]' : 'border-white/5 bg-white/5 text-[#94A3B8]'
                )}
              >
                B2B Usta
              </button>
              <button
                type="button"
                onClick={() => {
                  playLock();
                  switchDemoProfile('b2c_user');
                  setDropdownOpen(false);
                }}
                className={cn(
                  'py-1 text-[10px] font-bold rounded-lg border text-center transition-colors cursor-pointer',
                  !isB2B && !isAdmin ? 'border-[#00E599] bg-[#00E599]/20 text-[#00E599]' : 'border-white/5 bg-white/5 text-[#94A3B8]'
                )}
              >
                B2C Mijoz
              </button>
              <button
                type="button"
                onClick={() => {
                  playLock();
                  switchDemoProfile('super_admin');
                  setDropdownOpen(false);
                }}
                className={cn(
                  'py-1 text-[10px] font-bold rounded-lg border text-center transition-colors cursor-pointer',
                  isAdmin ? 'border-amber-400 bg-amber-400/20 text-amber-300' : 'border-white/5 bg-white/5 text-[#94A3B8]'
                )}
              >
                Admin
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-1.5 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                signOut();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <span>Hisobdan chiqish</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
