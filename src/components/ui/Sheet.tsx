'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'end';
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
  className
}: SheetProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const isBottom = position === 'bottom';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0A0B0F]/80 backdrop-blur-md"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={isBottom ? { y: '100%' } : { x: '100%' }}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'fixed bg-[#12141A]/95 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-10 flex flex-col',
              isBottom
                ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t p-6'
                : 'inset-y-0 end-0 w-full max-w-md border-s p-6',
              className
            )}
          >
            {/* Grab handle for bottom sheet */}
            {isBottom && (
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4 shrink-0" />
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
              {title ? (
                <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 overscroll-contain no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
