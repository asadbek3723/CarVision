'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { VeloceProduct } from '@/domain/veloce-catalog';

/**
 * The chosen parts as one row of small cards (three in view). Hovering a card shows ✕ to take the
 * part off the build. The row scrolls by dragging it or with the arrows.
 */
export function BuildStrip({
  parts,
  onRemove,
  priceOf,
  removeLabel,
  prevLabel,
  nextLabel,
}: {
  parts: VeloceProduct[];
  onRemove: (id: string) => void;
  priceOf: (p: VeloceProduct) => string;
  removeLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const row = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const justDragged = React.useRef(false);
  const [edges, setEdges] = React.useState({ start: false, end: false });

  const update = React.useCallback(() => {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft); // negative in right-to-left layouts
    setEdges({ start: pos > 2, end: pos < max - 2 });
  }, []);

  React.useEffect(() => {
    update();
    const el = row.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, parts.length]);

  const by = (dir: number) => {
    const el = row.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * rtl * ((card?.offsetWidth ?? 100) + 10), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={row}
        onScroll={update}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0 || !row.current) return;
          drag.current = { x: e.clientX, left: row.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !row.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 5) {
            d.moved = true;
            row.current.setPointerCapture(e.pointerId);
          }
          if (d.moved) row.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (d?.moved) {
            justDragged.current = true;
            setTimeout(() => {
              justDragged.current = false;
            }, 0);
          }
        }}
        onClickCapture={(e) => {
          if (justDragged.current) e.stopPropagation();
        }}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {parts.map((p) => (
          <figure key={p.id} className="group relative w-[calc((100%-1.25rem)/3)] shrink-0 snap-start select-none">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-1">
              {p.swatch && !p.image ? (
                <span className="block h-full w-full" style={{ background: p.swatch }} />
              ) : (
                <img src={p.image} alt="" draggable={false} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                aria-label={`${removeLabel}: ${p.name}`}
                className="absolute end-1.5 top-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.6} />
              </button>
            </div>
            <figcaption className="mt-1.5 min-w-0 px-0.5">
              <span className="block truncate text-[11px] leading-tight text-white/75">{p.name}</span>
              <span className="block text-[11px] tabular-nums text-gold-500">{priceOf(p)}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {parts.length > 3 && (
        <>
          <button
            type="button"
            onClick={() => by(-1)}
            aria-label={prevLabel}
            disabled={!edges.start}
            className="absolute -start-3 top-[calc(50%-14px)] grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/45 text-white/80 backdrop-blur-md transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => by(1)}
            aria-label={nextLabel}
            disabled={!edges.end}
            className="absolute -end-3 top-[calc(50%-14px)] grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/45 text-white/80 backdrop-blur-md transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </>
      )}
    </div>
  );
}
