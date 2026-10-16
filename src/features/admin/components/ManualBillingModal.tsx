'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CreditCard, CheckCircle2 } from 'lucide-react';

export interface ManualBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanAssigned?: () => void;
}

export function ManualBillingModal({
  isOpen,
  onClose,
  onPlanAssigned
}: ManualBillingModalProps) {
  const [shopQuery, setShopQuery] = React.useState('Autotune Pro');
  const [planCode, setPlanCode] = React.useState('PRO_800');
  const [credits, setCredits] = React.useState('800');
  const [paidAmount, setPaidAmount] = React.useState('29');
  const [currency, setCurrency] = React.useState('USD');
  const [method, setMethod] = React.useState('BANK_TRANSFER');
  const [adminNotes, setAdminNotes] = React.useState('Confirmed via Telegram accounting');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/admin/billing/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: 'c41829e0-8b1b-4ec9-8974-9b247fcf1e29',
          planCode,
          creditsToAdd: parseInt(credits, 10),
          paidAmountCents: Math.round(parseFloat(paidAmount) * 100),
          paymentCurrency: currency,
          paymentMethod: method,
          durationDays: 30,
          adminNotes,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onPlanAssigned?.();
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Manual billing error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Plan & Credits Assignment"
      description="Manually credit a workshop upon receiving offline payment (Bank transfer, Cash, Payme)."
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Workshop Partner</label>
          <input
            type="text"
            required
            value={shopQuery}
            onChange={(e) => setShopQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white focus:outline-none focus:border-accent-cyan"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Subscription Plan</label>
            <select
              value={planCode}
              onChange={(e) => {
                const p = e.target.value;
                setPlanCode(p);
                if (p === 'PRO_800') {
                  setCredits('800');
                  setPaidAmount('29');
                } else if (p === 'MAX_4000') {
                  setCredits('4000');
                  setPaidAmount('99');
                } else if (p === 'ULTRA_10000') {
                  setCredits('10000');
                  setPaidAmount('199');
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white focus:outline-none focus:border-accent-cyan"
            >
              <option value="PRO_800">Pro (800 Credits - $29)</option>
              <option value="MAX_4000">Max (4,000 Credits - $99)</option>
              <option value="ULTRA_10000">Ultra (10,000 Credits - $199)</option>
              <option value="CUSTOM">Custom Top-up</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Credits to Add</label>
            <input
              type="number"
              required
              min="1"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white font-mono focus:outline-none focus:border-accent-cyan"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Amount Paid</label>
            <input
              type="number"
              step="any"
              required
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white font-mono focus:outline-none focus:border-accent-cyan"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white focus:outline-none focus:border-accent-cyan"
            >
              <option value="USD">USD ($)</option>
              <option value="UZS">UZS (so‘m)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white focus:outline-none focus:border-accent-cyan"
          >
            <option value="BANK_TRANSFER">Bank Wire Transfer</option>
            <option value="CLICK_PAYME_MANUAL">Click / Payme (Manual)</option>
            <option value="CASH">Cash in Hand</option>
            <option value="OCTO">Octo Payment Link</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Admin Audit Note</label>
          <input
            type="text"
            required
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0A0B0F] border border-[#232733] text-sm text-white focus:outline-none focus:border-accent-cyan"
          />
        </div>

        {isSuccess && (
          <div className="p-3 rounded-xl bg-accent-green/20 border border-accent-green/40 text-accent-green text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Credits assigned successfully! Tablet notified in real-time.
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          variant="primary"
          className="w-full h-12 shadow-glow"
        >
          <CreditCard className="w-4 h-4 me-2" />
          <span>Confirm & Issue Credits</span>
        </Button>
      </form>
    </Modal>
  );
}
