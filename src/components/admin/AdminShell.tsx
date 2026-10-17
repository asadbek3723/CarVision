'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Store,
  DollarSign,
  Cpu,
  Tablet,
  ShieldCheck,
  Bell,
  Lock,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Link } from '@/i18n/routing';

export type AdminTab = 'dashboard' | 'studios' | 'escrow' | 'gpu-pipeline' | 'devices' | 'security';

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface AdminShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLockConsole: () => void;
  adminEmail?: string;
  children: React.ReactNode;
}

export function AdminShell({
  activeTab,
  onTabChange,
  onLockConsole,
  adminEmail = 'kursant410@gmail.com',
  children,
}: AdminShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);

  const navGroups: NavGroup[] = [
    {
      group: 'ASOSIY',
      items: [
        { id: 'dashboard', label: 'Boshqaruv', icon: LayoutDashboard },
        { id: 'studios', label: 'Atelyelar & Servislar', icon: Store, badge: '142' },
      ],
    },
    {
      group: 'OPERATSIYALAR',
      items: [
        { id: 'escrow', label: '3% Zakalat & To‘lovlar', icon: DollarSign, badge: '2', badgeColor: 'bg-amber-500/20 text-amber-300' },
        { id: 'gpu-pipeline', label: '4K AI Render Klasteri', icon: Cpu },
      ],
    },
    {
      group: 'TIZIM VA XAVFSIZLIK',
      items: [
        { id: 'devices', label: 'Qurilmalar & Sessiyalar', icon: Tablet },
        { id: 'security', label: 'Xavfsizlik & Audit', icon: ShieldCheck },
      ],
    },
  ];

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Boshqaruv Paneli & Tushum';
      case 'studios':
        return 'Hamkor Tuning Atelyelari';
      case 'escrow':
        return '3% Zakalat Depozitlari Audit';
      case 'gpu-pipeline':
        return 'AI 4K Render Quvvati & GPU';
      case 'devices':
        return 'Qurilmalar & Sessiyalar Nazorati';
      case 'security':
        return 'Xavfsizlik & Server Auditi';
    }
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-white flex flex-col md:flex-row overflow-x-hidden selection:bg-[#D4AE62]/20">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-[#0B0C10] border-e border-[#D4AE62]/15 transition-all duration-300 z-30 sticky top-0 h-screen ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="h-18 flex items-center px-4.5 border-b border-[#D4AE62]/10 justify-between">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1C1F2B] to-[#0F1117] flex items-center justify-center text-[#D4AE62] border border-[#D4AE62]/30 shadow-md">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm tracking-wider text-white block">CARVISION</span>
                  <span className="text-[10px] text-[#D4AE62] font-semibold tracking-widest block uppercase">
                    Admin Vault
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-9 h-9 rounded-xl bg-[#1C1F2B] flex items-center justify-center text-[#D4AE62]">
                <Shield className="w-5 h-5" />
              </div>
            )}

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Kengaytirish' : 'Yig‘ish'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-6 mt-3">
            {navGroups.map((grp, idx) => (
              <div key={idx} className="space-y-1">
                {!isSidebarCollapsed && (
                  <span className="px-3 text-[10px] font-bold text-[#64748B] tracking-wider uppercase block mb-1.5">
                    {grp.group}
                  </span>
                )}
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#D4AE62]/20 via-[#D4AE62]/10 to-transparent text-[#E5C378] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.03]'
                      } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-e-full bg-gradient-to-b from-[#D4AE62] to-[#E5C378]" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D4AE62]' : 'text-[#94A3B8] group-hover:text-white'}`} />
                      {!isSidebarCollapsed && (
                        <span className="truncate flex-1 text-start">{item.label}</span>
                      )}
                      {!isSidebarCollapsed && item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            item.badgeColor || 'bg-white/10 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer with Admin Profile and Lock Action */}
        <div className="p-3 border-t border-[#D4AE62]/10 space-y-2">
          {!isSidebarCollapsed && (
            <div className="p-2.5 rounded-xl bg-[#12141C] border border-white/5 flex items-center justify-between">
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">{adminEmail}</span>
                <span className="text-[10px] text-emerald-400 font-semibold block">Super Admin • 3723 Verified</span>
              </div>
            </div>
          )}

          <button
            onClick={onLockConsole}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Konsolni Qulflash & Chiqish"
          >
            <Lock className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Konsolni Qulflash</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#0B0C10]/95 backdrop-blur-md border-b border-[#D4AE62]/15 px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#64748B] hidden sm:inline">Admin</span>
              <span className="text-[#64748B] hidden sm:inline">/</span>
              <h1 className="text-sm font-bold text-white tracking-wide">
                {getTabTitle(activeTab)}
              </h1>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-3">
            {/* Live System Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#12141C] border border-[#D4AE62]/20 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>99.98% SLA (TAS-IX)</span>
            </div>

            {/* External Seller Studio shortcut */}
            <Link
              href="/seller"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#D4AE62] hover:text-[#E5C378] px-3 py-1.5 rounded-xl bg-[#12141C] border border-[#D4AE62]/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Atelye Kabineti</span>
            </Link>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2.5 rounded-xl bg-[#12141C] border border-white/5 text-[#94A3B8] hover:text-white transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-[#D4AE62] shadow-[0_0_8px_rgba(212,174,98,0.8)]" />
              </button>

              {isNotificationOpen && (
                <div className="absolute end-0 mt-2 w-80 rounded-2xl bg-[#0E1017] border border-[#D4AE62]/25 p-4 shadow-2xl z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="text-xs font-bold text-white">Bildirishnomalar</span>
                    <span className="text-[10px] text-[#D4AE62] font-semibold">2 ta yangi</span>
                  </div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#141722] border border-white/5">
                      <p className="text-white font-medium">Yangi 3% zakalat cheki #CV-9821</p>
                      <span className="text-[10px] text-[#64748B]">8 daqiqa oldin • Click</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#141722] border border-white/5">
                      <p className="text-white font-medium">Apex Customs MAX_4000 ga o‘tdi</p>
                      <span className="text-[10px] text-[#64748B]">1 soat oldin • Bank transfer</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lock Console Button for Mobile */}
            <button
              onClick={onLockConsole}
              className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer md:hidden"
              title="Qulflash"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content View */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85%] bg-[#0B0C10] h-full flex flex-col justify-between p-5 border-e border-[#D4AE62]/20 shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#D4AE62]/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1C1F2B] flex items-center justify-center text-[#D4AE62]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-white">CARVISION ADMIN</span>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-5 space-y-4">
                {navGroups.map((grp, i) => (
                  <div key={i} className="space-y-1">
                    <span className="px-2 text-[10px] font-bold text-[#64748B] tracking-wider uppercase block">
                      {grp.group}
                    </span>
                    {grp.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange(item.id);
                            setIsMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-[#D4AE62]/20 text-[#E5C378]'
                              : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#D4AE62]/10">
              <button
                onClick={onLockConsole}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-bold"
              >
                <Lock className="w-4 h-4" />
                <span>Konsolni Qulflash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
