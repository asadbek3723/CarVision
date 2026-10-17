'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PriceTickerProps {
  amountCents: number;
  currencySymbol?: string;
  locale?: string;
  className?: string;
}

export function PriceTicker({
  amountCents,
  currencySymbol = '$',
  className
}: PriceTickerProps) {
  const formattedNumber = (amountCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return (
    <div
      className={cn(
        'inline-flex items-baseline font-bold tracking-tight text-[#F5F7FA] font-mono tabular-nums',
        className
      )}
    >
      <span className="text-[#19D3FF] me-1 text-sm font-sans drop-shadow-[0_0_8px_rgba(25,211,255,0.6)]">
        {currencySymbol}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={amountCents}
          initial={{ y: 10, opacity: 0, filter: 'blur(2px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -10, opacity: 0, filter: 'blur(2px)' }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="inline-block text-white"
        >
          {formattedNumber}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
