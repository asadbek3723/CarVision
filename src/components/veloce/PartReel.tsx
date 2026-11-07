'use client';

import * as React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { type VeloceProduct } from '@/domain/veloce-catalog';

interface PartReelProps {
  items: VeloceProduct[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Fired when the part in the middle changes. */
  onFocusChange?: (id: string) => void;
  /**
   * Fired synchronously every time a tooth of the wheel passes the middle (drag, flick, arrows,
   * keys). Used for the light haptic "tick"; it must stay cheap and silent.
   */
  onTick?: () => void;
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

interface Metrics {
  size: number; // card edge, px
  slot: number; // distance between two neighbouring card centres, px
  step: number; // wheel rotation per card, radians
  top: number; // gap above the cards (room for the enlarged middle card), px
  height: number; // stage height, px
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function measure(width: number, viewportH = 900): Metrics {
  const wide = width >= 900;
  const mid = width >= 560;
  const byWidth = wide ? 200 : mid ? 168 : clamp(width * 0.31, 104, 156);
  // The page never scrolls: on short screens the cards shrink so everything still fits.
  const size = Math.round(clamp(Math.min(byWidth, viewportH * (wide ? 0.155 : 0.19)), 84, byWidth));
  const gap = wide ? 28 : 12;
  const slot = size * 1.04 + gap;
  const step = wide ? 0.13 : 0.085;
  const top = Math.round(size * 0.09) + 12;
  return { size, slot, step, top, height: Math.round(top + size * 1.09 + (wide ? 70 : 52)) };
}

// Spring that overshoots a little: the strip "clicks" onto the next tooth like a cog.
const STIFFNESS = 190;
const DAMPING = 17;

// Flick physics (units: cards, seconds). The wheel coasts with friction that grows as it slows,
// while a detent force pulls it into the nearest tooth, so it visibly ticks from tooth to tooth
// and finally clicks into one.
const MAX_SPEED = 11; // cards / s: a bit faster than a normal swipe, never a blur
const MIN_LAUNCH = 6; // cards / s: enough to roll over the next tooth
const MIN_FLICK = 1.3; // slower releases just snap to the nearest tooth
const DETENT = 18; // tooth pull; crossing a tooth needs ~3.4 cards/s
const FRICTION_BASE = 1.05;
const FRICTION_LOW_SPEED = 7;
const SUBSTEP = 1 / 240;

/**
 * Endless "reel" of parts that sits on the rim of a big wheel. Every swipe, arrow press or
 * wheel notch turns the wheel by one tooth: the cards travel along the arc, tilt with it and
 * settle with a small springy overshoot. Past the last part it wraps to the first, so the strip
 * never ends. The middle part is the largest and gold-framed, its neighbours shrink and blur
 * slightly (still readable). All motion is written straight to element styles in a
 * requestAnimationFrame loop, so React only re-renders when the part in the middle changes.
 */
export function PartReel({
  items,
  selectedIds,
  onToggle,
  onFocusChange,
  onTick,
  prevLabel,
  nextLabel,
  selectLabel,
  selectedLabel,
  formatPrice,
  fitFallback,
  ariaLabel,
}: PartReelProps) {
  const n = items.length;
  const half = n >= 7 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;

  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const slideRefs = React.useRef(new Map<number, HTMLDivElement>());
  const [metrics, setMetrics] = React.useState<Metrics>(() => measure(360));
  const metricsRef = React.useRef(metrics);
  const halfRef = React.useRef(half);
  const dirRef = React.useRef(1); // -1 in right-to-left layouts

  const posRef = React.useRef(0); // wheel position, in cards (float)
  const velRef = React.useRef(0);
  const targetRef = React.useRef(0);
  const centerRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const modeRef = React.useRef<'spring' | 'inertia'>('spring');
  const teethRef = React.useRef<HTMLDivElement | null>(null);
  const widthRef = React.useRef(360);
  const lastTRef = React.useRef(0);
  const [centerK, setCenterK] = React.useState(0);
  const onTickRef = React.useRef(onTick);
  onTickRef.current = onTick;

  const drag = React.useRef({ down: false, moved: false, startX: 0, startPos: 0, lastX: 0, lastT: 0, v: 0 });

  const paint = React.useCallback(() => {
    const { slot, step } = metricsRef.current;
    const pos = posRef.current;
    const h = halfRef.current;
    const dir = dirRef.current;
    const radius = slot / step;

    slideRefs.current.forEach((el, k) => {
      const d = k - pos;
      const ad = Math.abs(d);
      const a = d * step;
      const x = dir * radius * Math.sin(a);
      const y = radius * (1 - Math.cos(a));
      const scale = 1.18 - 0.32 * Math.min(ad, 1) - 0.06 * clamp(ad - 1, 0, 1);
      const blur = 1.8 * Math.min(ad, 1) + 1.2 * clamp(ad - 1, 0, 1);
      const fade = 1 - 0.45 * Math.min(ad, 1) - 0.25 * clamp(ad - 1, 0, 1) - 0.3 * clamp((ad - 2) / Math.max(h - 1.5, 0.5), 0, 1);
      const edge = clamp((h + 0.5 - ad) * 2, 0, 1);

      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(dir * a).toFixed(4)}rad) scale(${scale.toFixed(3)})`;
      el.style.opacity = (Math.max(fade, 0) * edge).toFixed(3);
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
      el.style.zIndex = String(Math.round(100 - ad * 10));
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) inner.dataset['active'] = ad < 0.5 ? '1' : '0';
    });

    const teeth = teethRef.current;
    if (teeth) teeth.style.backgroundPosition = `${(widthRef.current / 2 - 1 - dir * pos * slot).toFixed(1)}px 0`;

    const c = Math.round(pos);
    if (c !== centerRef.current) {
      centerRef.current = c;
      setCenterK(c);
      onTickRef.current?.();
    }
  }, []);

  const tick = React.useCallback(
    (now: number) => {
      const total = Math.min((now - lastTRef.current) / 1000, 1 / 30);
      lastTRef.current = now;
      const steps = Math.max(1, Math.ceil(total / SUBSTEP));
      const h = total / steps;
      const inertia = modeRef.current === 'inertia';

      for (let i = 0; i < steps; i++) {
        let acc: number;
        if (inertia) {
          const friction = FRICTION_BASE + FRICTION_LOW_SPEED * Math.exp(-Math.abs(velRef.current) / 1.5);
          acc = -friction * velRef.current - DETENT * Math.sin(2 * Math.PI * posRef.current);
        } else {
          acc = STIFFNESS * (targetRef.current - posRef.current) - DAMPING * velRef.current;
        }
        velRef.current += acc * h;
        posRef.current += velRef.current * h;
      }

      let settled: boolean;
      if (inertia) {
        const tooth = Math.round(posRef.current);
        targetRef.current = tooth;
        settled = Math.abs(velRef.current) < 0.06 && Math.abs(posRef.current - tooth) < 0.004;
      } else {
        settled = Math.abs(targetRef.current - posRef.current) < 0.0015 && Math.abs(velRef.current) < 0.02;
      }

      if (settled) {
        posRef.current = targetRef.current;
        velRef.current = 0;
        rafRef.current = 0;
        modeRef.current = 'spring';
        paint();
        return;
      }
      paint();
      rafRef.current = requestAnimationFrame(tick);
    },
    [paint]
  );

  const kick = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      posRef.current = targetRef.current;
      velRef.current = 0;
      paint();
      return;
    }
    if (rafRef.current) return;
    lastTRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [paint, tick]);

  const goTo = React.useCallback(
    (k: number) => {
      if (n < 2) return;
      modeRef.current = 'spring';
      targetRef.current = k;
      kick();
    },
    [kick, n]
  );
  const goBy = React.useCallback((delta: number) => goTo(Math.round(targetRef.current) + delta), [goTo]);

  // Measure the stage; cards, spacing and wheel curvature follow its width.
  React.useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const apply = () => {
      const next = measure(stage.clientWidth || 360, window.innerHeight);
      widthRef.current = stage.clientWidth || 360;
      dirRef.current = getComputedStyle(stage).direction === 'rtl' ? -1 : 1;
      metricsRef.current = next;
      setMetrics((prev) => (prev.size === next.size && prev.slot === next.slot && prev.step === next.step ? prev : next));
      paint();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [paint]);

  // New list (category / car changed): start again from the first part.
  React.useLayoutEffect(() => {
    halfRef.current = half;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    posRef.current = 0;
    velRef.current = 0;
    targetRef.current = 0;
    modeRef.current = 'spring';
    centerRef.current = 0;
    setCenterK(0);
    paint();
  }, [items, half, paint]);

  // Slides mount / unmount as the wheel turns: style the new ones before they are shown.
  React.useLayoutEffect(() => {
    paint();
  }, [centerK, metrics, paint]);

  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Horizontal trackpad / mouse-wheel gestures turn the wheel one tooth per notch.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 4) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last < 260) return;
      last = now;
      goBy(Math.sign(e.deltaX) * dirRef.current);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [goBy]);

  const activeIdx = n > 0 ? mod(centerK, n) : 0;
  const current = items[activeIdx];
  const lastFocused = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!current) return;
    // no tick for the part shown on first paint, only when the strip moves to another one
    if (lastFocused.current !== null && lastFocused.current !== current.id) onFocusChange?.(current.id);
    lastFocused.current = current.id;
  }, [current, onFocusChange]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (n < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const d = drag.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    modeRef.current = 'spring';
    d.down = true;
    d.moved = false;
    d.startX = d.lastX = e.clientX;
    d.startPos = posRef.current;
    d.lastT = performance.now();
    d.v = 0;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const now = performance.now();
    const dtMs = Math.max(now - d.lastT, 1);
    const inst = (e.clientX - d.lastX) / dtMs; // px per ms
    d.v = d.v * 0.7 + inst * 0.3;
    d.lastX = e.clientX;
    d.lastT = now;
    posRef.current = d.startPos - (dirRef.current * dx) / metricsRef.current.slot;
    velRef.current = 0;
    paint();
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) {
      const flick = (-dirRef.current * d.v * 1000) / metricsRef.current.slot; // cards per second
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && Math.abs(flick) >= MIN_FLICK) {
        modeRef.current = 'inertia';
        // never weaker than one tooth's worth of push, so a flick always moves on
        velRef.current = Math.sign(flick) * clamp(Math.abs(flick), MIN_LAUNCH, MAX_SPEED);
        targetRef.current = Math.round(posRef.current);
      } else {
        modeRef.current = 'spring';
        velRef.current = 0;
        targetRef.current = Math.round(posRef.current);
      }
      kick();
      // swallow the click that follows a drag
      setTimeout(() => {
        drag.current.moved = false;
      }, 0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isRtl = dirRef.current === -1;
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const back = isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) {
      e.preventDefault();
      goBy(1);
    } else if (e.key === back) {
      e.preventDefault();
      goBy(-1);
    } else if ((e.key === 'Enter' || e.key === ' ') && current) {
      e.preventDefault();
      onToggle(current.id);
    }
  };

  if (n === 0) return null;

  const isSelected = current ? selectedIds.includes(current.id) : false;
  const currentFit = current ? current.targetCar || current.compatibility?.[0]?.name || fitFallback : '';

  const slides: number[] = [];
  for (let k = centerK - half; k <= centerK + half; k++) slides.push(k);

  return (
    <div className="select-none lg:grid lg:grid-cols-5 lg:items-center lg:gap-6">
      <div className="relative isolate lg:col-span-3">
        {/* Edge fades hint that the strip goes on */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 z-[200] w-10 bg-gradient-to-r from-[#0D0E12] to-transparent lg:w-28 rtl:bg-gradient-to-l" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 z-[200] w-10 bg-gradient-to-l from-[#0D0E12] to-transparent lg:w-28 rtl:bg-gradient-to-r" />

        <div
          ref={stageRef}
          role="listbox"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{ height: metrics.height, touchAction: 'pan-y' }}
          className="relative cursor-grab overflow-hidden outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#D4AE62]/50"
        >
          {/* Gear rim: teeth slide past as the wheel turns */}
          <div
            ref={teethRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-2 h-3 [mask-image:linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(212,174,98,0.5) 0 2px, transparent 2px)',
              backgroundSize: `${metrics.slot / 2}px 100%`,
            }}
          />
          {slides.map((k) => {
            const part = items[mod(k, n)]!;
            const picked = selectedIds.includes(part.id);
            return (
              <div
                key={k}
                ref={(el) => {
                  if (el) slideRefs.current.set(k, el);
                  else slideRefs.current.delete(k);
                }}
                role="option"
                aria-selected={picked}
                aria-label={part.name}
                onClick={() => {
                  if (drag.current.moved) return;
                  if (k === Math.round(targetRef.current)) onToggle(part.id);
                  else goTo(k);
                }}
                style={{
                  position: 'absolute',
                  top: metrics.top,
                  insetInlineStart: '50%',
                  width: metrics.size,
                  height: metrics.size,
                  marginInlineStart: -metrics.size / 2,
                  willChange: 'transform, opacity, filter',
                  opacity: 0,
                }}
              >
                <div
                  data-active="0"
                  className="relative h-full w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0E1016] transition-[box-shadow,border-color] duration-300 data-[active=1]:border-[#D4AE62] data-[active=1]:shadow-[0_0_0_4px_rgba(212,174,98,0.08),0_18px_44px_-10px_rgba(212,174,98,0.4)] lg:rounded-[28px]"
                >
                  {part.swatch ? (
                    <div className="h-full w-full" style={{ background: part.swatch }} />
                  ) : (
                    <img src={part.image} alt="" draggable={false} loading="lazy" className="pointer-events-none h-full w-full object-cover" />
                  )}
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  {picked && (
                    <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#D4AE62] text-black shadow-lg lg:h-7 lg:w-7">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop arrows (the strip wraps, so they never disable) */}
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => goBy(-dirRef.current)}
              aria-label={prevLabel}
              className="absolute start-1 top-1/2 z-[210] hidden h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white/80 backdrop-blur-md transition hover:bg-black/75 hover:text-white md:grid lg:h-12 lg:w-12"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => goBy(dirRef.current)}
              aria-label={nextLabel}
              className="absolute end-1 top-1/2 z-[210] hidden h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white/80 backdrop-blur-md transition hover:bg-black/75 hover:text-white md:grid lg:h-12 lg:w-12"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      {/* Details of the centred part */}
      {current && (
        <div className="mx-auto mt-1 max-w-sm px-6 text-center lg:col-span-2 lg:mx-0 lg:mt-0 lg:max-w-none lg:px-6 lg:text-start xl:px-10" aria-live="polite">
          <h3 className="truncate font-display text-lg font-medium uppercase tracking-[0.14em] text-white lg:whitespace-normal lg:text-2xl lg:leading-snug lg:tracking-[0.1em] lg:[display:-webkit-box] lg:[-webkit-box-orient:vertical] lg:[-webkit-line-clamp:3]">{current.name}</h3>
          <p className="mt-1 truncate text-xs text-white/50 lg:mt-3 lg:whitespace-normal lg:text-[15px] lg:leading-relaxed lg:text-white/60 lg:[display:-webkit-box] lg:[-webkit-box-orient:vertical] lg:[-webkit-line-clamp:5]">{[current.spec, currentFit].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex items-center justify-center gap-3 lg:mt-5 lg:justify-start lg:gap-5">
            <span className="text-base font-semibold tabular-nums text-[#D4AE62] lg:text-3xl">{formatPrice(Number(current.price) || 0)}</span>
            <button
              type="button"
              onClick={() => onToggle(current.id)}
              aria-pressed={isSelected}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-95 lg:min-h-10 lg:px-6 lg:text-sm ${
                isSelected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.08] text-white/85 hover:bg-white/[0.14]'
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {isSelected ? selectedLabel : selectLabel}
            </button>
          </div>
          <p className="mt-2 hidden text-[11px] tabular-nums tracking-[0.2em] text-white/30 lg:mt-4 lg:block">
            {activeIdx + 1} / {n}
          </p>
        </div>
      )}
    </div>
  );
}
