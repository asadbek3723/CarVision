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
        'inline-flex items-baseline font-bold tracking-tight text-white font-mono',
        className
      )}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="text-accent-cyan me-1 text-sm font-sans">{currencySymbol}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={amountCents}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-block"
        >
          {formattedNumber}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
