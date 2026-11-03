'use client';

import * as React from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { SelectedPartBuild } from '../types';
import type { CashierSummary } from '@/domain/pricing';
import type { CategorySlot } from '@/domain/angle-validator';
import { Trash2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export interface ItemizedSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBuild: Map<CategorySlot, SelectedPartBuild>;
  cashierSummary: CashierSummary;
  onRemoveItem: (slot: CategorySlot) => void;
  onProceedToBooking?: () => void;
}

export function ItemizedSummaryDrawer({
  isOpen,
  onClose,
  selectedBuild,
  cashierSummary,
  onRemoveItem,
  onProceedToBooking
}: ItemizedSummaryDrawerProps) {
  const buildList = Array.from(selectedBuild.values());

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Itemized Build Spec Sheet">
      <div className="flex flex-col h-full justify-between">
        {/* Parts List */}
        <div className="space-y-3 mb-6">
          {buildList.map(({ slot, item }) => (
            <div
              key={slot}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#181B22]/90 border border-white/10 hover:border-white/20 transition-all shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.imageUrl}
                  alt={item.partName}
                  className="w-14 h-14 rounded-xl object-contain bg-black/60 p-1.5 shrink-0 border border-white/5"
                />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#19D3FF]">
                    {item.brand}
                  </span>
                  <h4 className="text-sm font-semibold text-white truncate">{item.partName}</h4>
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono tabular-nums">
                    <span>${(item.priceCents / 100).toFixed(0)} part</span>
                    <span>•</span>
                    <span>${(item.laborCostCents / 100).toFixed(0)} fitment</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveItem(slot)}
                className="p-2 text-[#94A3B8] hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer shrink-0 ms-2"
                aria-label={`Remove ${item.partName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {buildList.length === 0 && (
            <div className="py-12 text-center text-sm text-[#94A3B8] flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                <Sparkles className="w-6 h-6 text-[#19D3FF]" />
              </div>
              <p className="max-w-xs text-xs leading-relaxed">
                No modifications selected yet. Tap parts in the bottom dock to custom-build your vehicle in 4K.
              </p>
            </div>
          )}
        </div>

        {/* Financial Breakdown Table */}
        <div className="border-t border-white/10 pt-4 space-y-2.5 text-sm text-[#94A3B8]">
          <div className="flex justify-between items-center">
            <span>Parts Total</span>
            <span className="text-white font-mono font-semibold tabular-nums">
              ${(cashierSummary.partsTotalCents / 100).toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Certified Bay Labor &amp; Fitment</span>
            <span className="text-white font-mono font-semibold tabular-nums">
              ${(cashierSummary.laborTotalCents / 100).toFixed(0)}
            </span>
          </div>

          <div className="flex justify-between items-center text-base font-bold text-white pt-2.5 border-t border-white/10">
            <span>Grand Total</span>
            <span className="text-[#19D3FF] font-mono text-xl tabular-nums drop-shadow-[0_0_10px_rgba(25,211,255,0.4)]">
              ${(cashierSummary.grandTotalCents / 100).toFixed(0)}
            </span>
          </div>

          {/* 3% Escrow Highlight */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#19D3FF]/15 to-[#12141A] border border-[#19D3FF]/30 mt-3 flex items-start gap-3 shadow-lg">
            <ShieldCheck className="w-5 h-5 text-[#19D3FF] shrink-0 mt-0.5" />
            <div className="text-xs text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">3% Escrow Reservation:</span>
                <span className="font-mono text-[#19D3FF] font-extrabold text-sm tabular-nums">
                  ${(cashierSummary.depositAmountCents / 100).toFixed(0)}
                </span>
              </div>
              <p className="mt-1 leading-relaxed text-[11px]">
                Guarantees parts inventory in the workshop bay and is 100% credited toward your final garage invoice.
              </p>
            </div>
          </div>

          {/* CTA Action */}
          <div className="pt-4">
            <Button
              onClick={() => {
                onClose();
                onProceedToBooking?.();
              }}
              disabled={buildList.length === 0}
              variant="primary"
              size="lg"
              className="w-full text-base font-bold shadow-glow"
            >
              <span>Book Installation &amp; Lock Price</span>
              <ArrowRight className="w-4 h-4 ms-2" />
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
