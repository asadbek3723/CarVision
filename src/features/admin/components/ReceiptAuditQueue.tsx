'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Check, X, ShieldAlert, FileText } from 'lucide-react';

export interface PendingReceiptItem {
  id: string;
  bookingNumber: string;
  customerName: string;
  shopName: string;
  amountFormatted: string;
  receiptUrl: string;
  confidence: number;
}

const DEMO_RECEIPTS: PendingReceiptItem[] = [
  {
    id: 'rcp-01',
    bookingNumber: 'CV-BKG-8812',
    customerName: 'Javohir Turgunov',
    shopName: 'Autotune Pro',
    amountFormatted: '565,500 UZS ($43.50)',
    receiptUrl: 'https://cdn.carvision.app/receipts/demo-click.webp',
    confidence: 0.79, // Just under 0.85 threshold, flagged for human eye
  },
];

export function ReceiptAuditQueue() {
  const [receipts, setReceipts] = React.useState<PendingReceiptItem[]>(DEMO_RECEIPTS);

  const handleAction = (id: string, action: 'APPROVE' | 'REJECT' | 'BAN') => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    console.info(`Receipt ${id} resolved with action: ${action}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent-cyan" />
          <h3 className="text-lg font-bold text-white">Receipt Verification Queue</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">{receipts.length} pending review</span>
      </div>

      <div className="space-y-3">
        {receipts.map((rcp) => (
          <GlassCard key={rcp.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">{rcp.bookingNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  OCR Conf: {(rcp.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Customer: <span className="text-white font-medium">{rcp.customerName}</span> • Target: <span className="text-white font-medium">{rcp.shopName}</span>
              </p>
              <p className="text-xs font-mono font-bold text-accent-cyan">{rcp.amountFormatted}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => handleAction(rcp.id, 'APPROVE')}
                variant="success"
                size="sm"
                className="h-9 px-3 text-xs"
              >
                <Check className="w-3.5 h-3.5 me-1" /> Approve (A)
              </Button>
              <Button
                onClick={() => handleAction(rcp.id, 'REJECT')}
                variant="secondary"
                size="sm"
                className="h-9 px-3 text-xs"
              >
                <X className="w-3.5 h-3.5 me-1" /> Reject (R)
              </Button>
              <Button
                onClick={() => handleAction(rcp.id, 'BAN')}
                variant="danger"
                size="sm"
                className="h-9 px-3 text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 me-1" /> Ban Fraud (B)
              </Button>
            </div>
          </GlassCard>
        ))}

        {receipts.length === 0 && (
          <GlassCard className="p-8 text-center text-xs text-[#94A3B8]">
            All payment receipts have been verified. 24/7 AUTO_OCR is handling incoming transfers.
          </GlassCard>
        )}
      </div>
    </div>
  );
}
