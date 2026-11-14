'use client';

import * as React from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, EyeOff } from 'lucide-react';
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
  /** First touch on the strip (e.g. to unlock audio for the tick sound). */
  onPointerStart?: () => void;
  /** Finger lifted after a drag; runs inside the touch-end event (iPhone haptic needs that). */
  onRelease?: () => void;
  /** Label for the previous / next arrows (desktop). */
  prevLabel: string;
  nextLabel: string;
  /** Formats a catalog (USD) price into the user's currency. */
  formatPrice: (usd: number) => string;
  /** Fallback when a part carries no "fits this car" text. */
  fitFallback: string;
  /** Label for a part that fits every car. */
  universalLabel: string;
  /** Accessible name of the whole strip. */
  ariaLabel: string;
  /**
   * `vertical`: the wheel stands upright and fills its parent's height (desktop side column);
   * the details of the centred part are not drawn here, the page shows them via `onCurrentChange`.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Parts no photographed side can show: drawn dimmed with a hidden-eye mark (tapping still reports them). */
  disabledIds?: string[];
  /** The part in the middle, on first paint and every time it changes. */
  onCurrentChange?: (part: VeloceProduct) => void;
}

interface Metrics {
  size: number; // card height, px
  cardW: number; // card width, px (4:3 on desktop, square on phones and tablets)
  slot: number; // distance between two neighbouring card centres, px
  step: number; // wheel rotation per card, radians
  top: number; // gap above the cards (room for the enlarged middle card), px
  height: number; // stage height, px
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Desktop (lg and up) shows landscape 4:3 cards; smaller screens keep them square. */
const DESKTOP_MIN_VIEWPORT = 1024;

export function measure(width: number, viewportH = 900, viewportW = 0): Metrics {
  const wide = width >= 900;
  const mid = width >= 560;
  const byWidth = wide ? 200 : mid ? 168 : clamp(width * 0.31, 104, 156);
  // The page never scrolls: on short screens the cards shrink so everything still fits.
  const size = Math.round(clamp(Math.min(byWidth, viewportH * (wide ? 0.155 : 0.19)), 84, byWidth));
  const cardW = viewportW >= DESKTOP_MIN_VIEWPORT ? Math.round((size * 4) / 3) : size;
  const gap = wide ? 28 : 12;
  const slot = cardW * 1.04 + gap;
  const step = wide ? 0.13 : 0.085;
  const top = Math.round(size * 0.09) + 12;
  return { size, cardW, slot, step, top, height: Math.round(top + size * 1.09 + (wide ? 70 : 52)) };
}

/** Upright wheel in a side column: landscape 4:3 cards as wide as the column allows. */
export function measureVertical(width: number, height: number): Metrics {
  // The middle card is drawn 1.18x: keep it inside the column.
  const cardW = Math.round(clamp((width - 20) / 1.2, 110, 210));
  const size = Math.round((cardW * 3) / 4);
  const slot = size * 1.04 + 16;
  return { size, cardW, slot, step: 0.16, top: 0, height: Math.max(height, size + 40) };
}

// Spring that overshoots a little: the strip "clicks" onto the next tooth like a cog.
const STIFFNESS = 190;
const DAMPING = 17;

// Flick physics (units: cards, seconds). The wheel coasts with friction that grows as it slows,
// while a detent force pulls it into the nearest tooth, so it visibly ticks from tooth to tooth
// and finally clicks into one.
// A heavy flywheel: a gentle push barely turns it, a hard flick spins it fast and it coasts down,
// clicking over each tooth, until a detent catches it.
const MAX_SPEED = 26; // cards / s: a hard flick really spins
const MIN_LAUNCH = 4.5; // cards / s: a real flick always rolls over at least one tooth
const MIN_FLICK = 1.6; // slower releases just settle into the nearest tooth
const FLICK_GAIN = 1.35; // a flick carries a bit more energy than the finger's own speed
const DETENT = 18; // tooth pull; crossing a tooth needs ~3.4 cards/s
const FRICTION_BASE = 0.55; // low drag while fast: long, smooth coast
const FRICTION_LOW_SPEED = 6.5; // drag rises as it slows, so it settles instead of crawling
// Drag resistance: slow finger movement moves the wheel less than the finger (heavy feel);
// fast movement follows the finger 1:1.
const DRAG_GAIN_SLOW = 0.32;
const DRAG_FULL_SPEED = 0.9; // px / ms at which the wheel follows the finger fully
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
  onPointerStart,
  onRelease,
  prevLabel,
  nextLabel,
  formatPrice,
  fitFallback,
  universalLabel,
  ariaLabel,
  orientation = 'horizontal',
  onCurrentChange,
  disabledIds,
}: PartReelProps) {
  const vertical = orientation === 'vertical';
  const n = items.length;
  const [stageH, setStageH] = React.useState(0);
  const verticalRef = React.useRef(vertical);
  verticalRef.current = vertical;

  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const slideRefs = React.useRef(new Map<number, HTMLDivElement>());
  const [metrics, setMetrics] = React.useState<Metrics>(() => (vertical ? measureVertical(220, 520) : measure(360)));
  // Cards drawn either side of the middle. Upright, as many as fill the column (up to the whole list).
  const halfFlat = n >= 7 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;
  const reach = stageH > 0 ? Math.ceil(stageH / 2 / metrics.slot) + 1 : 3;
  const half = vertical && n >= 7 ? Math.max(3, reach) : halfFlat;
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
      // Flat: cards ride the top of a wheel. Upright: they ride its right-hand rim, curving away
      // to the left above and below the middle.
      const x = verticalRef.current ? -radius * (1 - Math.cos(a)) : dir * radius * Math.sin(a);
      const y = verticalRef.current ? radius * Math.sin(a) : radius * (1 - Math.cos(a));
      const rot = verticalRef.current ? -a * 0.45 : dir * a;
      const scale = 1.18 - 0.32 * Math.min(ad, 1) - 0.06 * clamp(ad - 1, 0, 1);
      const blur = 1.8 * Math.min(ad, 1) + 1.2 * clamp(ad - 1, 0, 1);
      const fade = 1 - 0.45 * Math.min(ad, 1) - 0.25 * clamp(ad - 1, 0, 1) - 0.3 * clamp((ad - 2) / Math.max(h - 1.5, 0.5), 0, 1);
      const edge = clamp((h + 0.5 - ad) * 2, 0, 1);

      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(4)}rad) scale(${scale.toFixed(3)})`;
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
      const next = verticalRef.current
        ? measureVertical(stage.clientWidth || 220, stage.clientHeight || 520)
        : measure(stage.clientWidth || 360, window.innerHeight, window.innerWidth);
      if (verticalRef.current) setStageH(stage.clientHeight || 0);
      widthRef.current = stage.clientWidth || 360;
      // Up/down does not flip in right-to-left layouts.
      dirRef.current = !verticalRef.current && getComputedStyle(stage).direction === 'rtl' ? -1 : 1;
      metricsRef.current = next;
      setMetrics((prev) =>
        prev.size === next.size && prev.cardW === next.cardW && prev.slot === next.slot && prev.step === next.step ? prev : next
      );
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
  // How many cards are drawn can change with the column height: no reset, just repaint.
  React.useLayoutEffect(() => {
    halfRef.current = half;
    paint();
  }, [half, paint]);

  React.useLayoutEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    posRef.current = 0;
    velRef.current = 0;
    targetRef.current = 0;
    modeRef.current = 'spring';
    centerRef.current = 0;
    setCenterK(0);
    paint();
  }, [items, paint]);

  // Slides mount / unmount as the wheel turns: style the new ones before they are shown.
  React.useLayoutEffect(() => {
    paint();
  }, [centerK, metrics, paint]);

  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Trackpad / mouse-wheel gestures along the strip turn the wheel one tooth per notch.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      const main = verticalRef.current ? e.deltaY : e.deltaX;
      const cross = verticalRef.current ? e.deltaX : e.deltaY;
      if (Math.abs(main) <= Math.abs(cross) || Math.abs(main) < 4) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last < 260) return;
      last = now;
      goBy(Math.sign(main) * dirRef.current);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [goBy]);

  const activeIdx = n > 0 ? mod(centerK, n) : 0;
  const current = items[activeIdx];
  const onCurrentRef = React.useRef(onCurrentChange);
  onCurrentRef.current = onCurrentChange;
  React.useEffect(() => {
    if (current) onCurrentRef.current?.(current);
  }, [current]);
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
    onPointerStart?.();
    d.down = true;
    d.moved = false;
    d.startX = d.lastX = vertical ? e.clientY : e.clientX;
    d.startPos = posRef.current;
    d.lastT = performance.now();
    d.v = 0;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    const along = vertical ? e.clientY : e.clientX;
    const dx = along - d.startX;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      d.lastX = along;
      d.lastT = performance.now();
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (!d.moved) return;
    const now = performance.now();
    const dtMs = Math.max(now - d.lastT, 1);
    const step = along - d.lastX; // px since the last move event
    const inst = step / dtMs; // px per ms
    d.v = d.v * 0.7 + inst * 0.3;
    d.lastX = along;
    d.lastT = now;
    // Heavy wheel: the slower the finger, the less of its movement turns the wheel.
    const gain = clamp(DRAG_GAIN_SLOW + (1 - DRAG_GAIN_SLOW) * (Math.abs(inst) / DRAG_FULL_SPEED), DRAG_GAIN_SLOW, 1);
    posRef.current -= (dirRef.current * step * gain) / metricsRef.current.slot;
    velRef.current = 0;
    paint();
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) {
      onRelease?.();
      // A finger that stopped before lifting carries no momentum.
      const idle = performance.now() - d.lastT > 90;
      const flick = idle ? 0 : (-dirRef.current * d.v * 1000 * FLICK_GAIN) / metricsRef.current.slot; // cards per second
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
    const forward = vertical ? 'ArrowDown' : isRtl ? 'ArrowLeft' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : isRtl ? 'ArrowRight' : 'ArrowLeft';
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

  const currentFit = current ? (current.isUniversal ? universalLabel : current.targetCar || current.compatibility?.[0]?.name || fitFallback) : '';

  const slides: number[] = [];
  for (let k = centerK - half; k <= centerK + half; k++) slides.push(k);

  return (
    <div className={vertical ? 'h-full select-none' : 'select-none xl:grid xl:grid-cols-5 xl:items-center xl:gap-6'}>
      <div className={vertical ? 'relative isolate h-full' : 'relative isolate xl:col-span-3'}>
        {/* Edge fades hint that the strip goes on */}
        {/* Upright: the ends fade through a mask instead, so there is no box against the page */}
        {vertical ? null : (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 z-[200] w-10 bg-gradient-to-r from-[#0D0E12] to-transparent lg:w-28 rtl:bg-gradient-to-l" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 z-[200] w-10 bg-gradient-to-l from-[#0D0E12] to-transparent lg:w-28 rtl:bg-gradient-to-r" />
          </>
        )}

        <div
          ref={stageRef}
          role="listbox"
          aria-label={ariaLabel}
          aria-orientation={vertical ? 'vertical' : 'horizontal'}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={
            vertical
              ? {
                  height: '100%',
                  touchAction: 'pan-x',
                  maskImage: 'linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%)',
                }
              : { height: metrics.height, touchAction: 'pan-y' }
          }
          className="relative cursor-grab overflow-hidden outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-gold-500/50"
        >
          {slides.map((k) => {
            const part = items[mod(k, n)]!;
            const picked = selectedIds.includes(part.id);
            const disabled = !picked && Boolean(disabledIds?.includes(part.id));
            return (
              <div
                key={k}
                ref={(el) => {
                  if (el) slideRefs.current.set(k, el);
                  else slideRefs.current.delete(k);
                }}
                role="option"
                aria-selected={picked}
                aria-disabled={disabled || undefined}
                aria-label={part.name}
                onClick={() => {
                  if (drag.current.moved) return;
                  if (k === Math.round(targetRef.current)) onToggle(part.id);
                  else goTo(k);
                }}
                style={{
                  position: 'absolute',
                  top: vertical ? '50%' : metrics.top,
                  ...(vertical ? { marginTop: -metrics.size / 2 } : {}),
                  insetInlineStart: '50%',
                  width: metrics.cardW,
                  height: metrics.size,
                  marginInlineStart: -metrics.cardW / 2,
                  willChange: 'transform, opacity, filter',
                  opacity: 0,
                }}
              >
                <div
                  data-active="0"
                  className="relative h-full w-full overflow-hidden rounded-[22px] bg-surface-1 transition-[box-shadow,border-color] duration-300 data-[active=1]:border-gold-500 data-[active=1]:shadow-[0_0_0_4px_rgba(232,191,116,0.08),0_18px_44px_-10px_rgba(232,191,116,0.4)] lg:rounded-[28px]"
                >
                  {part.swatch ? (
                    <div className={`h-full w-full ${disabled ? 'opacity-40 grayscale' : ''}`} style={{ background: part.swatch }} />
                  ) : (
                    <img src={part.image} alt="" draggable={false} loading="lazy" className={`pointer-events-none h-full w-full object-cover ${disabled ? 'opacity-40 grayscale' : ''}`} />
                  )}
                  {disabled && (
                    <span aria-hidden className="absolute start-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/80 backdrop-blur-md lg:h-7 lg:w-7">
                      <EyeOff className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  {picked && (
                    <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-gold-500 text-black shadow-lg lg:h-7 lg:w-7">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop arrows (the strip wraps, so they never disable) */}
        {n > 1 && vertical && (
          <>
            <button
              type="button"
              onClick={() => goBy(-1)}
              aria-label={prevLabel}
              className="absolute start-1/2 top-1 z-[210] grid h-10 w-10 -translate-x-1/2 rtl:translate-x-1/2 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-white/60 opacity-60 backdrop-blur-md transition hover:bg-white/[0.12] hover:text-white hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goBy(1)}
              aria-label={nextLabel}
              className="absolute bottom-1 start-1/2 z-[210] grid h-10 w-10 -translate-x-1/2 rtl:translate-x-1/2 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-white/60 opacity-60 backdrop-blur-md transition hover:bg-white/[0.12] hover:text-white hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </>
        )}
        {n > 1 && !vertical && (
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

      {/* Details of the centred part (the upright wheel leaves them to the page) */}
      {current && !vertical && (
        <div className="mx-auto mt-1 max-w-sm px-6 text-center xl:col-span-2 xl:mx-0 xl:mt-0 xl:max-w-none xl:px-6 xl:text-start 2xl:px-10" aria-live="polite">
          <h3 className="truncate font-display text-lg font-medium uppercase tracking-[0.14em] text-white xl:whitespace-normal xl:text-2xl xl:leading-snug xl:tracking-[0.1em] xl:[display:-webkit-box] xl:[-webkit-box-orient:vertical] xl:[-webkit-line-clamp:3]">{current.name}</h3>
          <p className="mt-1 truncate text-xs text-white/50 xl:mt-3 xl:whitespace-normal xl:text-[15px] xl:leading-relaxed xl:text-white/60 xl:[display:-webkit-box] xl:[-webkit-box-orient:vertical] xl:[-webkit-line-clamp:5]">{[current.spec, currentFit].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex items-center justify-center gap-3 xl:mt-5 xl:justify-start xl:gap-5">
            <span className="text-base font-semibold tabular-nums text-gold-500 xl:text-3xl">{formatPrice(Number(current.price) || 0)}</span>
          </div>
          <p className="mt-2 hidden text-[11px] tabular-nums tracking-[0.2em] text-white/30 xl:mt-4 xl:block">
            {activeIdx + 1} / {n}
          </p>
        </div>
      )}
    </div>
  );
}
