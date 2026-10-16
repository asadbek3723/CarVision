'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import type { UnlockedShopDetails } from './ReceiptUploadModal';
import { CheckCircle2, MapPin, Phone, QrCode, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

export interface VoucherUnlockedScreenProps {
  details: UnlockedShopDetails;
  onReset?: () => void;
}

export function VoucherUnlockedScreen({ details }: VoucherUnlockedScreenProps) {
  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Success Badge */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-accent-green/20 text-accent-green flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(0,229,153,0.3)]">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-black text-white">Booking Confirmed!</h2>
        <p className="text-xs text-[#94A3B8]">
          Your 3% escrow deposit was verified. Workshop contact information is now unlocked.
        </p>
      </div>

      {/* Workshop Unlocked Card */}
      <GlassCard className="p-6 space-y-4 border-accent-cyan/40 shadow-glow">
        <div className="border-b border-[#232733] pb-4">
          <span className="text-[10px] uppercase font-bold text-accent-cyan tracking-wider">Confirmed Workshop</span>
          <h3 className="text-xl font-bold text-white mt-0.5">{details.shopName}</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Exact Address:</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">{details.exactAddress}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-accent-cyan shrink-0" />
            <div>
              <p className="font-semibold text-white">Direct Workshop Phone:</p>
              <a href={`tel:${details.phone}`} className="text-xs text-accent-cyan hover:underline font-mono">
                {details.phone}
              </a>
            </div>
          </div>
        </div>

        {/* 6-Digit Voucher Code Box */}
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-center space-y-1.5 mt-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#94A3B8]">
            <QrCode className="w-4 h-4 text-accent-cyan" />
            <span>Show this code to workshop technician:</span>
          </div>
          <div className="font-mono text-3xl font-black tracking-widest text-accent-cyan">
            {details.bookingRedemptionCode}
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Your deposit will be credited directly against your final service invoice.
          </p>
        </div>
      </GlassCard>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link href="/studio/demo" className="flex-1">
          <Button variant="secondary" className="w-full h-12">
            Back to Studio
          </Button>
        </Link>
        <Link href="/marketplace" className="flex-1">
          <Button variant="primary" className="w-full h-12 shadow-glow">
            <span>Marketplace</span>
            <ArrowRight className="w-4 h-4 ms-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
