'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { QrCode, CheckCircle2, AlertCircle } from 'lucide-react';

export interface RedeemVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoucherRedeemed?: (depositCents: number) => void;
}

export function RedeemVoucherModal({
  isOpen,
  onClose,
  onVoucherRedeemed
}: RedeemVoucherModalProps) {
  const [code, setCode] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    customerName?: string;
    depositCents?: number;
    error?: string;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) return;

    setIsVerifying(true);
    setResult(null);

    try {
      // Simulate voucher verification RPC call
      await new Promise((r) => setTimeout(r, 600));

      if (code === '748-912' || code.includes('748')) {
        setResult({
          success: true,
          customerName: 'Sardor Aliyev',
          depositCents: 4350, // $43.50 (approx 565,500 UZS)
        });
        onVoucherRedeemed?.(4350);
      } else {
        setResult({
          success: false,
          error: 'Voucher not found or already redeemed.',
        });
      }
    } catch {
      setResult({
        success: false,
        error: 'Network error verifying voucher code.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Redeem Customer 3% Deposit"
      description="Enter the customer's 6-digit voucher code to apply their deposit discount to the final invoice."
    >
      <form onSubmit={handleVerify} className="space-y-4 p-2">
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
            Voucher Code (Format: XXX-XXX)
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 748-912"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-[#232733] text-white font-mono text-center text-xl tracking-wider focus:outline-none focus:border-accent-cyan"
            />
            <QrCode className="absolute end-3 top-3.5 w-5 h-5 text-[#94A3B8] pointer-events-none" />
          </div>
        </div>

        {result && (
          <div
            className={
              result.success
                ? 'p-4 rounded-xl bg-accent-green/20 border border-accent-green/40 text-accent-green text-xs'
                : 'p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs'
            }
          >
            {result.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Valid Voucher Confirmed!
                </div>
                <p className="text-white">Customer: {result.customerName}</p>
                <p className="text-white font-mono font-bold text-sm">
                  Deduct ${(result.depositCents! / 100).toFixed(2)} from total invoice
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{result.error}</span>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={isVerifying || code.length < 6}
          isLoading={isVerifying}
          variant="primary"
          className="w-full h-12"
        >
          Confirm & Apply Voucher
        </Button>
      </form>
    </Modal>
  );
}
