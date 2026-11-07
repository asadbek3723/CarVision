'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' } as const;

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode | undefined;
  /** Sticky action row under the scrolling body. */
  footer?: React.ReactNode | undefined;
  size?: keyof typeof widths | undefined;
  /** Hide the title visually (still read by screen readers). */
  hideTitle?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
};

function useIsDesktop() {
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

function Dialog({ placement, open, onClose, title, description, footer, size = 'md', hideTitle = false, className, children }: SheetProps & { placement: 'sheet' | 'center' }) {
  const t = useTranslations('common');
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const [mounted, setMounted] = React.useState(false);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => setMounted(true), []);

  // ESC, focus trap, scroll lock and focus restore while open.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!mounted) return null;

  const asSheet = placement === 'sheet' && !desktop;
  const hidden = reduce ? { opacity: 0 } : asSheet ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.97 };
  const shown = reduce ? { opacity: 1 } : asSheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-[80] flex justify-center', asSheet ? 'items-end' : 'items-center p-4 sm:p-6')}>
          <motion.div
            className="absolute inset-0 bg-surface-0/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={reduce ? { duration: 0.15 } : SPRING}
            className={cn(
              'relative flex w-full flex-col bg-surface-1 shadow-e4 focus:outline-none',
              asSheet ? 'max-h-[92dvh] rounded-t-xl' : cn('max-h-[88dvh] rounded-xl', widths[size]),
              className
            )}
          >
            {asSheet && <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-700" />}
            <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-7 sm:pt-6">
              <div className={cn('min-w-0 pt-2', hideTitle && 'sr-only')}>
                <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em] text-foreground">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="-me-2 ms-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-micro hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 sm:px-7', footer ? 'pb-4' : 'pb-[max(var(--safe-bottom),20px)] sm:pb-7')}>
              {children}
            </div>
            {footer && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 px-5 pb-[max(var(--safe-bottom),20px)] pt-3 sm:px-7 sm:pb-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Bottom sheet on phones, centered dialog from 640px up. */
export function Sheet(props: SheetProps) {
  return <Dialog placement="sheet" {...props} />;
}

/** Centered dialog at every width (confirmations, short forms). */
export function Modal(props: SheetProps) {
  return <Dialog placement="center" {...props} />;
}
