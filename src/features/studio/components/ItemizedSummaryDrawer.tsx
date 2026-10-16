'use client';

import * as React from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { SelectedPartBuild } from '../types';
import type { CashierSummary } from '@/domain/pricing';
import type { CategorySlot } from '@/domain/angle-validator';
import { Trash2, ShieldCheck, ArrowRight } from 'lucide-react';

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
    <Sheet isOpen={isOpen} onClose={onClose} title="Itemized Build Summary">
      <div className="flex flex-col h-full justify-between">
        {/* Parts List */}
        <div className="space-y-3 mb-6">
          {buildList.map(({ slot, item }) => (
            <div
              key={slot}
              className="flex items-center justify-between p-3 rounded-xl bg-[#181B22] border border-[#232733]"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.imageUrl}
                  alt={item.partName}
                  className="w-12 h-12 rounded-lg object-contain bg-black/40 p-1 shrink-0"
                />
                <div>
                  <h4 className="text-sm font-semibold text-white line-clamp-1">{item.partName}</h4>
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    <span>${(item.priceCents / 100).toFixed(0)} part</span>
                    <span>•</span>
                    <span>${(item.laborCostCents / 100).toFixed(0)} labor</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveItem(slot)}
                className="p-2 text-[#94A3B8] hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                aria-label={`Remove ${item.partName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {buildList.length === 0 && (
            <p className="text-sm text-[#94A3B8] py-8 text-center">
              No modifications selected yet. Tap parts in the bottom dock to build your vehicle.
            </p>
          )}
        </div>

        {/* Financial Breakdown Table */}
        <div className="border-t border-[#232733] pt-4 space-y-2 text-sm text-[#94A3B8]">
          <div className="flex justify-between">
            <span>Parts Total</span>
            <span className="text-white font-mono">${(cashierSummary.partsTotalCents / 100).toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Labor & Installation</span>
            <span className="text-white font-mono">${(cashierSummary.laborTotalCents / 100).toFixed(0)}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#232733]">
            <span>Grand Total</span>
            <span className="text-accent-cyan font-mono">${(cashierSummary.grandTotalCents / 100).toFixed(0)}</span>
          </div>

          {/* 3% Escrow Highlight */}
          <div className="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 mt-3 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
            <div className="text-xs text-[#94A3B8]">
              <span className="font-semibold text-white">3% Escrow Deposit: </span>
              <span className="font-mono text-accent-cyan font-bold">${(cashierSummary.depositAmountCents / 100).toFixed(0)}</span>
              <p className="mt-0.5">Guarantees your parts reservation and is fully deducted from your final bill.</p>
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
              className="w-full h-14 text-base"
            >
              <span>Book Installation</span>
              <ArrowRight className="w-4 h-4 ms-2" />
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
