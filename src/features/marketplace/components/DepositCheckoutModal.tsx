'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { MaskedShopData } from './MaskedShopCard';
import { ShieldCheck, CreditCard, Clock, Upload, Copy, Check } from 'lucide-react';

export interface DepositCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop?: MaskedShopData | undefined;
  totalPriceCents: number;
  depositAmountCents: number;
  onOpenReceiptUpload: () => void;
}

export function DepositCheckoutModal({
  isOpen,
  onClose,
  shop,
  totalPriceCents,
  depositAmountCents,
  onOpenReceiptUpload
}: DepositCheckoutModalProps) {
  const [copied, setCopied] = React.useState(false);

  const cardPan = '8600 4902 1184 9921';
  const cardHolder = 'CarVision Escrow LLC';
  const depositUzsFormatted = `${new Intl.NumberFormat('uz-UZ').format(Math.round((depositAmountCents / 100) * 13000))} UZS`;

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardPan.replace(/\s/g, ''));
    setCopied(true);
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="3% Escrow Deposit Booking"
      description={`Reserving installation slot with ${shop?.maskedLabel ?? 'Verified Partner'}`}
    >
      <div className="space-y-4 p-1">
        {/* Price & Deposit Summary */}
        <div className="p-4 rounded-2xl bg-[#181B22]/90 border border-white/10 space-y-2 text-sm text-[#94A3B8]">
          <div className="flex justify-between items-center">
            <span>Total Modifications:</span>
            <span className="font-mono text-white font-bold tabular-nums">${(totalPriceCents / 100).toFixed(0)}</span>
          </div>
          <div className="flex justify-between items-center font-bold text-white pt-2.5 border-t border-white/10">
            <span className="text-[#19D3FF]">Mandatory 3% Escrow:</span>
            <span className="font-mono text-[#19D3FF] text-base tabular-nums drop-shadow-[0_0_8px_rgba(25,211,255,0.4)]">
              ${(depositAmountCents / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-[#19D3FF] font-mono">
            <span>Local currency equivalent:</span>
            <span className="tabular-nums font-semibold">{depositUzsFormatted}</span>
          </div>
        </div>

        {/* Payment Card Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#12141A] via-[#181B22] to-[#12141A] border border-[#19D3FF]/30 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <CreditCard className="w-4 h-4 text-[#19D3FF]" />
              <span>Direct Bank Transfer (Uzcard / Humo)</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5" /> 45:00 min remaining
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/60 px-4 py-3 rounded-xl border border-white/10">
            <span className="font-mono text-lg tracking-widest text-white font-bold">{cardPan}</span>
            <button
              onClick={handleCopyCard}
              className="p-2 text-[#94A3B8] hover:text-[#19D3FF] rounded-lg transition-colors cursor-pointer"
              aria-label="Copy card number"
            >
              {copied ? <Check className="w-4 h-4 text-[#00E599]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-between text-[11px] text-[#94A3B8] font-mono">
            <span>Holder: {cardHolder}</span>
            <span>Bank: Kapitalbank Escrow</span>
          </div>
        </div>

        {/* Protection Explainer */}
        <div className="flex items-start gap-3 text-xs text-[#94A3B8] p-3.5 rounded-2xl bg-[#19D3FF]/10 border border-[#19D3FF]/25 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-[#19D3FF] shrink-0 mt-0.5" />
          <span>
            Your 3% deposit is held in escrow and deducted 100% from your final garage invoice.
            If the partner workshop cancels, you are refunded immediately.
          </span>
        </div>

        {/* Upload Receipt Action */}
        <Button
          onClick={() => {
            onClose();
            onOpenReceiptUpload();
          }}
          variant="primary"
          size="lg"
          className="w-full shadow-glow font-bold"
        >
          <Upload className="w-4 h-4 me-2" />
          <span>I Have Transferred — Upload Receipt</span>
        </Button>
      </div>
    </Modal>
  );
}
