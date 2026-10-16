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
        <div className="p-4 rounded-xl bg-[#181B22] border border-[#232733] space-y-2 text-sm text-[#94A3B8]">
          <div className="flex justify-between">
            <span>Total Modifications:</span>
            <span className="font-mono text-white">${(totalPriceCents / 100).toFixed(0)}</span>
          </div>
          <div className="flex justify-between font-bold text-white pt-2 border-t border-[#232733]">
            <span className="text-accent-cyan">Mandatory 3% Deposit:</span>
            <span className="font-mono text-accent-cyan text-base">${(depositAmountCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-accent-cyan font-mono">
            <span>Local currency equivalent:</span>
            <span>{depositUzsFormatted}</span>
          </div>
        </div>

        {/* Payment Card Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12141A] to-[#181B22] border border-accent-cyan/30 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <CreditCard className="w-4 h-4 text-accent-cyan" /> Bank Transfer (Uzcard / Humo)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" /> 45:00 min remaining
            </span>
          </div>

          <div className="flex items-center justify-between bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
            <span className="font-mono text-lg tracking-widest text-white">{cardPan}</span>
            <button
              onClick={handleCopyCard}
              className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg transition-colors"
              aria-label="Copy card number"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-between text-[11px] text-[#94A3B8]">
            <span>Recipient: {cardHolder}</span>
            <span>Bank: Kapitalbank</span>
          </div>
        </div>

        {/* Protection Explainer */}
        <div className="flex items-start gap-2.5 text-xs text-[#94A3B8] p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20">
          <ShieldCheck className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
          <span>
            Your 3% deposit is held in escrow and deducted 100% from your final bill at the shop.
            If the workshop cancels, you are refunded immediately.
          </span>
        </div>

        {/* Upload Receipt Action */}
        <Button
          onClick={() => {
            onClose();
            onOpenReceiptUpload();
          }}
          variant="primary"
          className="w-full h-12 shadow-glow"
        >
          <Upload className="w-4 h-4 me-2" />
          <span>I Have Transferred — Upload Receipt</span>
        </Button>
      </div>
    </Modal>
  );
}
