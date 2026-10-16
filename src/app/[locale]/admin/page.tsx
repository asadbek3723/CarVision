'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { ManualBillingModal } from '@/features/admin/components/ManualBillingModal';
import { LiveGenerationStream } from '@/features/admin/components/LiveGenerationStream';
import { ReceiptAuditQueue } from '@/features/admin/components/ReceiptAuditQueue';
import { DeviceQuotaInspector } from '@/features/admin/components/DeviceQuotaInspector';
import { Shield, PlusCircle, Bell, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function SuperAdminPage() {
  const [isBillingModalOpen, setIsBillingModalOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#232733] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link href="/seller" className="text-[#94A3B8] hover:text-white transition-colors me-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 text-accent-cyan flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">CarVision God Mode Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 ms-10">
            Authenticated as: <span className="text-accent-cyan font-mono">kursant410@gmail.com</span> (MFA Verified aal2)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl glass-panel text-[#94A3B8] hover:text-white transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          </button>

          <Button
            onClick={() => setIsBillingModalOpen(true)}
            variant="primary"
            className="shadow-glow"
          >
            <PlusCircle className="w-4 h-4 me-2" />
            <span>Assign Plan / Top-Up</span>
          </Button>
        </div>
      </header>

      {/* Grid of Admin Tools */}
      <div className="space-y-8">
        {/* 1. Live Render Feed */}
        <section>
          <LiveGenerationStream />
        </section>

        {/* 2. Receipt Verification & Fraud Queue */}
        <section>
          <ReceiptAuditQueue />
        </section>

        {/* 3. Active Devices & Sharing Inspector */}
        <section>
          <DeviceQuotaInspector />
        </section>
      </div>

      {/* Manual Billing Modal */}
      <ManualBillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
      />
    </div>
  );
}
