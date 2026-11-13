'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

/** Gap kept between the panel and the screen edge (the page's 16px side gutter). */
const EDGE = 16;
const PANEL_MAX = 320;

/**
 * A small round "i" button that opens a short explanation under it. Opens on tap/click (phones have
 * no hover), closes on a second tap, Escape, a tap outside or scrolling. The panel is placed against
 * the screen and kept inside it, wherever the button sits; it is rendered into <body> so an animated
 * (transformed) ancestor cannot move it.
 */
export function InfoTip({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const open = pos !== null;
  const rootRef = React.useRef<HTMLSpanElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLSpanElement | null>(null);
  const panelId = React.useId();

  const toggle = () => {
    if (open) return setPos(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(PANEL_MAX, window.innerWidth - EDGE * 2);
    const rtl = document.documentElement.dir === 'rtl';
    const wanted = rtl ? rect.right - width : rect.left;
    const left = Math.max(EDGE, Math.min(wanted, window.innerWidth - width - EDGE));
    setPos({ left, top: rect.bottom + 8, width });
  };

  React.useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDC902]/70"
      >
        <Info className="h-4 w-4" />
      </button>
      {pos &&
        createPortal(
          <span
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            style={{ left: pos.left, top: pos.top, width: pos.width }}
            className="fixed z-50 block rounded-2xl border border-white/10 bg-[#161616] p-4 text-start shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]"
          >
            {children}
          </span>,
          document.body
        )}
    </span>
  );
}
