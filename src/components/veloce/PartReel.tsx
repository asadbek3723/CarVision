'use client';

import * as React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { type VeloceProduct } from '@/domain/veloce-catalog';

interface PartReelProps {
  items: VeloceProduct[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Fired when the part in the middle changes (used for a light haptic tick). */
  onFocusChange?: (id: string) => void;
  /** Label for the previous / next arrows (desktop). */
  prevLabel: string;
  nextLabel: string;
  /** Text for the pick / picked pill under the centred part. */
  selectLabel: string;
  selectedLabel: string;
  /** Formats a catalog (USD) price into the user's currency. */
  formatPrice: (usd: number) => string;
  /** Fallback when a part carries no "fits this car" text. */
  fitFallback: string;
  /** Accessible name of the whole strip. */
  ariaLabel: string;
}

const GAP = 14;

/**
 * Horizontal "reel" of parts: swipe left / right and the next part snaps to the middle,
 * one flick = one part (like a short-video feed, but sideways). The part in the middle is
 * enlarged and framed in gold, its neighbours shrink and fade. Native scroll-snap does the
 * physics, so the motion stays on the compositor thread and never stutters; only transform
 * and opacity are written per frame, with no React re-render while scrolling.
 */
export function PartReel({
  items,
  selectedIds,
  onToggle,
  onFocusChange,
  prevLabel,
  nextLabel,
  selectLabel,
  selectedLabel,
  formatPrice,
  fitFallback,
  ariaLabel,
}: PartReelProps) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const slideRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const frame = React.useRef(0);
  const activeRef = React.useRef(0);
  const [active, setActive] = React.useState(0);

  const drag = React.useRef({ down: false, moved: false, startX: 0, startLeft: 0 });

  const paint = React.useCallback(() => {
    frame.current = 0;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;

    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const mid = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
      // 0 at the centre, 1 one full slot away (clamped)
      const p = Math.min(dist / (slide.offsetWidth + GAP), 1);
      const inner = slide.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.transform = `scale(${(1.14 - 0.34 * p).toFixed(3)}) translateZ(0)`;
        inner.style.opacity = (1 - 0.5 * p).toFixed(3);
      }
    });

    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, []);

  const schedulePaint = React.useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const goTo = React.useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;
    const left = slide.offsetLeft + slide.offsetWidth / 2 - scroller.clientWidth / 2;
    scroller.scrollTo({ left, behavior });
  }, []);

  // New list (category / car changed): start from the first part.
  React.useEffect(() => {
    activeRef.current = 0;
    setActive(0);
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft = 0;
    paint();
  }, [items, paint]);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const ro = new ResizeObserver(() => {
      goTo(activeRef.current, 'auto');
      schedulePaint();
    });
    ro.observe(scroller);
    return () => {
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [goTo, schedulePaint]);

  const current = items[active];
  const lastFocused = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!current) return;
    // no tick for the part shown on first paint, only when the swipe moves to another one
    if (lastFocused.current !== null && lastFocused.current !== current.id) onFocusChange?.(current.id);
    lastFocused.current = current.id;
  }, [current, onFocusChange]);

  // Mouse drag (touch and trackpads already scroll natively)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startLeft: scroller.scrollLeft };
    scroller.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const scroller = scrollerRef.current;
    if (!d.down || !scroller) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
    scroller.scrollLeft = d.startLeft - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const scroller = scrollerRef.current;
    if (!d.down || !scroller) return;
    d.down = false;
    scroller.style.scrollSnapType = '';
    goTo(activeRef.current);
    // let the click that follows a drag be ignored
    setTimeout(() => {
      drag.current.moved = false;
    }, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isRtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const back = isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) {
      e.preventDefault();
      goTo(Math.min(items.length - 1, activeRef.current + 1));
    } else if (e.key === back) {
      e.preventDefault();
      goTo(Math.max(0, activeRef.current - 1));
    } else if ((e.key === 'Enter' || e.key === ' ') && current) {
      e.preventDefault();
      onToggle(current.id);
    }
  };

  const isSelected = current ? selectedIds.includes(current.id) : false;
  const currentFit = current ? current.targetCar || current.compatibility?.[0]?.name || fitFallback : '';

  return (
    <div className="select-none">
      <div className="relative">
        {/* Edge fades hint that the strip continues */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r from-[#0D0E12] to-transparent rtl:bg-gradient-to-l" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l from-[#0D0E12] to-transparent rtl:bg-gradient-to-r" />

        <div
          ref={scrollerRef}
          role="listbox"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          tabIndex={0}
          onScroll={schedulePaint}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{
            gap: GAP,
            paddingInline: 'calc(50% - var(--reel-w) / 2)',
            ['--reel-w' as string]: 'clamp(104px, 31vw, 156px)',
            scrollSnapType: 'x mandatory',
            overscrollBehaviorX: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          className="flex cursor-grab items-center overflow-x-auto overflow-y-hidden py-7 outline-none [scrollbar-width:none] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#D4AE62]/50 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((part, i) => {
            const picked = selectedIds.includes(part.id);
            const isActive = i === active;
            return (
              <div
                key={part.id}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                role="option"
                aria-selected={picked}
                aria-label={part.name}
                onClick={() => {
                  if (drag.current.moved) return;
                  if (i === activeRef.current) onToggle(part.id);
                  else goTo(i);
                }}
                style={{ width: 'var(--reel-w)', scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
                className="aspect-square shrink-0"
              >
                <div
                  style={{ transform: 'scale(0.8)', opacity: 0.5, willChange: 'transform, opacity' }}
                  className={`relative h-full w-full overflow-hidden rounded-[22px] bg-[#0E1016] transition-[box-shadow,border-color] duration-300 ${
                    isActive
                      ? 'border border-[#D4AE62] shadow-[0_0_0_4px_rgba(212,174,98,0.08),0_18px_44px_-10px_rgba(212,174,98,0.4)]'
                      : 'border border-white/10'
                  }`}
                >
                  {part.swatch ? (
                    <div className="h-full w-full" style={{ background: part.swatch }} />
                  ) : (
                    <img
                      src={part.image}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      className="pointer-events-none h-full w-full object-cover"
                    />
                  )}
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  {picked && (
                    <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#D4AE62] text-black shadow-lg">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop arrows */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              aria-label={prevLabel}
              className="absolute start-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white/80 backdrop-blur-md transition hover:bg-black/75 hover:text-white disabled:pointer-events-none disabled:opacity-0 md:grid"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(items.length - 1, active + 1))}
              disabled={active === items.length - 1}
              aria-label={nextLabel}
              className="absolute end-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white/80 backdrop-blur-md transition hover:bg-black/75 hover:text-white disabled:pointer-events-none disabled:opacity-0 md:grid"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      {/* Details of the centred part */}
      {current && (
        <div className="mx-auto mt-1 max-w-sm px-6 text-center" aria-live="polite">
          <h3 className="truncate font-display text-lg font-medium uppercase tracking-[0.14em] text-white">{current.name}</h3>
          <p className="mt-1 truncate text-xs text-white/50">
            {[current.spec, currentFit].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-base font-semibold tabular-nums text-[#D4AE62]">{formatPrice(Number(current.price) || 0)}</span>
            <button
              type="button"
              onClick={() => onToggle(current.id)}
              aria-pressed={isSelected}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-95 ${
                isSelected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.08] text-white/85 hover:bg-white/[0.14]'
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {isSelected ? selectedLabel : selectLabel}
            </button>
          </div>
          <p className="mt-3 text-[11px] tabular-nums tracking-[0.2em] text-white/30">
            {active + 1} / {items.length}
          </p>
        </div>
      )}
    </div>
  );
}
