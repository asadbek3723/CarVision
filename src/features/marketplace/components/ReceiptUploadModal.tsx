'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface UnlockedShopDetails {
  shopName: string;
  phone: string;
  exactAddress: string;
  bookingRedemptionCode: string;
}

export interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string | undefined;
  onVerificationSuccess: (details: UnlockedShopDetails) => void;
}

export function ReceiptUploadModal({
  isOpen,
  onClose,
  bookingId: _bookingId = 'demo-booking-1',
  onVerificationSuccess
}: ReceiptUploadModalProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const handleSimulatedUpload = async () => {
    setIsAnalyzing(true);
    setFileName('receipt_payment_565500uzs.png');

    try {
      // Simulate server-side AI Vision OCR call to POST /api/v1/bookings/:id/submit-receipt
      await new Promise((r) => setTimeout(r, 2200));

      const unlockedShop: UnlockedShopDetails = {
        shopName: 'Autotune Pro Tashkent',
        phone: '+998 90 123 45 67',
        exactAddress: 'Amir Temur ko‘chasi 108A, Yunusobod tumani, Tashkent',
        bookingRedemptionCode: '748-912',
      };

      onVerificationSuccess(unlockedShop);
      onClose();
    } catch (err) {
      console.error('Receipt verification error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Payment Receipt"
      description="Upload a screenshot of your bank transfer. AI will verify the receipt and instantly unlock workshop contact details."
    >
      <div className="space-y-4 p-1">
        {/* Dropzone */}
        <div
          onClick={handleSimulatedUpload}
          className="border-2 border-dashed border-[#232733] hover:border-accent-cyan/60 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#0A0B0F]/50 flex flex-col items-center justify-center group"
        >
          {isAnalyzing ? (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin mx-auto" />
              <div className="flex items-center gap-1.5 text-xs text-accent-cyan font-semibold justify-center">
                <Sparkles className="w-4 h-4" /> AI OCR verifying transaction details...
              </div>
              <p className="text-[11px] text-[#94A3B8]">Validating recipient card PAN and deposit amount</p>
            </div>
          ) : fileName ? (
            <div className="space-y-2">
              <CheckCircle2 className="w-10 h-10 text-accent-green mx-auto" />
              <p className="text-sm font-semibold text-white">{fileName}</p>
              <p className="text-xs text-[#94A3B8]">Click to upload a different screenshot</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Click or drag receipt screenshot here</p>
              <p className="text-xs text-[#94A3B8]">Supports Click, Payme, Uzum, Bank receipt (JPG, PNG)</p>
            </div>
          )}
        </div>

        {/* 24/7 Auto OCR Notice */}
        <div className="flex items-center gap-2 text-xs text-[#94A3B8] p-3 rounded-xl bg-[#181B22] border border-[#232733]">
          <ShieldCheck className="w-4 h-4 text-accent-cyan shrink-0" />
          <span>24/7 Autonomous Verification: Approved in 2.5 seconds without waiting for staff.</span>
        </div>

        <Button
          onClick={handleSimulatedUpload}
          disabled={isAnalyzing}
          isLoading={isAnalyzing}
          variant="primary"
          className="w-full h-12 shadow-glow"
        >
          {isAnalyzing ? 'Verifying Receipt...' : 'Submit Receipt for Instant Unlock'}
        </Button>
      </div>
    </Modal>
  );
}
