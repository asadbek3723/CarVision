'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { CustomerViewLockModal } from './CustomerViewLockModal';
import { RedeemVoucherModal } from './RedeemVoucherModal';
import { OneClickCatalogImporter } from './OneClickCatalogImporter';
import { CustomPartUploader } from './CustomPartUploader';
import { Camera, Layers, QrCode, Lock, ArrowUpRight, AlertCircle, Wrench } from 'lucide-react';
import { Link } from '@/i18n/routing';

export interface SellerDashboardProps {
  shopName?: string;
  creditsBalance?: number;
  planCode?: string;
  activeDevicesCount?: number;
  maxDevicesAllowed?: number;
}

export function SellerDashboard({
  shopName = 'Autotune Pro Tashkent',
  creditsBalance = 78,
  planCode = 'PRO_800',
  activeDevicesCount = 1,
  maxDevicesAllowed = 2,
}: SellerDashboardProps) {
  const [isLockModalOpen, setIsLockModalOpen] = React.useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = React.useState(false);
  const [isImporterOpen, setIsImporterOpen] = React.useState(false);
  const [isCustomPartOpen, setIsCustomPartOpen] = React.useState(false);
  const [isCustomerViewLocked, setIsCustomerViewLocked] = React.useState(false);

  const handleToggleLock = (pin: string) => {
    if (pin === '1234' || pin.length === 4) {
      setIsCustomerViewLocked(!isCustomerViewLocked);
      return true;
    }
    return false;
  };

  const isLowCredits = creditsBalance < 80;

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#232733]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{shopName}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
              Verified Partner
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Workshop Control Console • Plan: {planCode}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsLockModalOpen(true)}
            variant={isCustomerViewLocked ? 'primary' : 'secondary'}
            size="sm"
            className="h-10"
          >
            <Lock className="w-4 h-4 me-2" />
            <span>{isCustomerViewLocked ? 'Customer View Active' : 'Lock for Customer'}</span>
          </Button>

          <Link href="/studio/demo">
            <Button variant="primary" size="sm" className="h-10 shadow-glow">
              <Camera className="w-4 h-4 me-2" />
              <span>New Vehicle Walkaround</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Low Credits FOMO Warning Banner */}
      {isLowCredits && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white">Only {creditsBalance} image credits remaining! </span>
              <span className="text-[#94A3B8]">Upgrade your subscription to prevent walk-in interruptions.</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0 text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
            <span>Upgrade Plan</span>
            <ArrowUpRight className="w-3.5 h-3.5 ms-1" />
          </Button>
        </div>
      )}

      {/* 3. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Credits Balance Meter */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Available Credits</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-accent-cyan">{creditsBalance}</span>
            <span className="text-xs text-[#94A3B8]">/ 800 monthly</span>
          </div>
          <div className="w-full bg-[#181B22] h-2 rounded-full overflow-hidden">
            <div
              className="bg-accent-cyan h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (creditsBalance / 800) * 100)}%` }}
            />
          </div>
        </GlassCard>

        {/* Active Tablet Sessions */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Active Device Limit</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white">{activeDevicesCount}</span>
            <span className="text-xs text-[#94A3B8]">/ {maxDevicesAllowed} tablets allowed</span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Plan allows 2 concurrent workshop tablets</p>
        </GlassCard>

        {/* 3% Escrow Voucher Quick Tool */}
        <GlassCard className="p-5 flex flex-col justify-between bg-accent-cyan/5 border-accent-cyan/30">
          <span className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">3% Customer Voucher</span>
          <p className="text-xs text-[#94A3B8] my-2">Customer booked online? Enter code to deduct deposit from invoice.</p>
          <Button onClick={() => setIsVoucherModalOpen(true)} variant="primary" size="sm" className="w-full">
            <QrCode className="w-4 h-4 me-2" />
            <span>Redeem 6-Digit Code</span>
          </Button>
        </GlassCard>
      </div>

      {/* 4. Quick Actions Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard
          onClick={() => setIsImporterOpen(!isImporterOpen)}
          className="p-5 cursor-pointer hover:border-accent-cyan/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">1-Click Catalog Importer</h3>
              <p className="text-xs text-[#94A3B8]">Stock 30+ items with market pricing in 3 minutes</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-[#94A3B8] group-hover:text-accent-cyan transition-colors" />
        </GlassCard>

        <GlassCard
          onClick={() => setIsCustomPartOpen(!isCustomPartOpen)}
          className="p-5 cursor-pointer hover:border-accent-cyan/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 text-accent-green flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Custom Part</h3>
              <p className="text-xs text-[#94A3B8]">Upload raw photo; AI cuts out background for 4K renders</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-[#94A3B8] group-hover:text-accent-green transition-colors" />
        </GlassCard>
      </div>

      {/* Expandable Importer / Custom Part Sections */}
      {isImporterOpen && <OneClickCatalogImporter onImportComplete={() => setIsImporterOpen(false)} />}
      {isCustomPartOpen && <CustomPartUploader onPartAdded={() => setIsCustomPartOpen(false)} />}

      {/* 5. Modals */}
      <CustomerViewLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        isLocked={isCustomerViewLocked}
        onToggleLock={handleToggleLock}
      />

      <RedeemVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
      />
    </div>
  );
}
