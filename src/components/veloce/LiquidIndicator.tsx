'use client';

import * as React from 'react';

export interface LiquidIndicatorHandle {
  /** Follow the finger: put the glass at this (fractional) dock column right now. */
  scrub: (col: number) => void;
  /** Let go: glide to this column on a spring. */
  settle: (col: number) => void;
}

interface LiquidIndicatorProps {
  /** Column of the screen on display (null = none of the dock's items, the glass fades out). */
  col: number | null;
  /** Number of equal dock columns. */
  columns: number;
  rtl: boolean;
}

// Soft, almost critically damped spring: a calm glide that lands without bouncing.
// Tuned to the slower page slides, so the glass and the screens arrive together.
const STIFFNESS = 70;
const DAMPING = 17;
/** How much the drop stretches along the motion per (column / second) of speed, and its cap. */
const STRETCH_PER_SPEED = 0.22;
const MAX_STRETCH = 1.6;

/**
 * The dock's "liquid glass" selection: one glowing drop of gold light on the dock's top edge,
 * shared by all tabs (the icons themselves are not boxed in). It follows the finger while the
 * pages are swiped, stretching like a drop of liquid with the speed, and glides to the new tab on
 * a soft spring when the finger lifts or a tab is tapped. Driven with transforms outside React, so it never costs a re-render per frame.
 */
export const LiquidIndicator = React.forwardRef<LiquidIndicatorHandle, LiquidIndicatorProps>(function LiquidIndicator(
  { col, columns, rtl },
  ref
) {
  const railRef = React.useRef<HTMLDivElement | null>(null);
  const glassRef = React.useRef<HTMLDivElement | null>(null);
  const lineRef = React.useRef<HTMLDivElement | null>(null);
  const s = React.useRef({ pos: col ?? 0, vel: 0, target: col ?? 0, raf: 0, last: 0, scrubAt: 0, shown: col !== null });
  const reduce = React.useRef(false);

  React.useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const paint = React.useCallback(
    (pos: number, vel: number) => {
      const rail = railRef.current;
      const glass = glassRef.current;
      const line = lineRef.current;
      if (!rail || !glass || !line) return;
      const stretch = reduce.current ? 0 : Math.min(Math.abs(vel) * STRETCH_PER_SPEED, MAX_STRETCH);
      rail.style.transform = `translate3d(${(rtl ? -pos : pos) * 100}%,0,0)`;
      // A drop of liquid light: it stretches along the motion and thins as it speeds up.
      line.style.transform = `scale(${1 + stretch}, ${1 - Math.min(stretch, 1) * 0.35})`;
      glass.style.transform = `scaleX(${1 + stretch * 0.8})`;
      glass.style.opacity = String(0.55 + Math.min(stretch, 1) * 0.35);
    },
    [rtl]
  );

  const stop = () => {
    if (s.current.raf) cancelAnimationFrame(s.current.raf);
    s.current.raf = 0;
  };

  const step = React.useCallback(
    (now: number) => {
      const st = s.current;
      const dt = Math.min((now - st.last) / 1000, 1 / 30);
      st.last = now;
      // Two sub-steps keep the spring stable on slow frames.
      for (let i = 0; i < 2; i++) {
        const h = dt / 2;
        const acc = STIFFNESS * (st.target - st.pos) - DAMPING * st.vel;
        st.vel += acc * h;
        st.pos += st.vel * h;
      }
      if (Math.abs(st.target - st.pos) < 0.001 && Math.abs(st.vel) < 0.01) {
        st.pos = st.target;
        st.vel = 0;
        st.raf = 0;
        paint(st.pos, 0);
        return;
      }
      paint(st.pos, st.vel);
      st.raf = requestAnimationFrame(step);
    },
    [paint]
  );

  const settle = React.useCallback(
    (target: number) => {
      const st = s.current;
      st.target = target;
      if (reduce.current) {
        stop();
        st.pos = target;
        st.vel = 0;
        paint(target, 0);
        return;
      }
      if (!st.raf) {
        st.last = performance.now();
        st.raf = requestAnimationFrame(step);
      }
    },
    [paint, step]
  );

  const scrub = React.useCallback(
    (pos: number) => {
      const st = s.current;
      stop();
      const now = performance.now();
      const dt = Math.max((now - (st.scrubAt || now)) / 1000, 1 / 120);
      // Smoothed finger speed drives the stretch.
      st.vel = st.scrubAt ? st.vel * 0.6 + ((pos - st.pos) / dt) * 0.4 : 0;
      st.pos = pos;
      st.scrubAt = now;
      paint(pos, st.vel);
    },
    [paint]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      scrub,
      settle: (c: number) => {
        s.current.scrubAt = 0;
        settle(c);
      },
    }),
    [scrub, settle]
  );

  // The route changed (dock tap, back button, end of a swipe): glide there.
  React.useEffect(() => {
    const st = s.current;
    if (col === null) {
      st.shown = false;
      return;
    }
    if (!st.shown) {
      // Appearing (e.g. back from a full-screen page): no travel, just fade in at the right place.
      st.shown = true;
      stop();
      st.pos = st.target = col;
      st.vel = 0;
      paint(col, 0);
      return;
    }
    settle(col);
  }, [col, paint, settle]);

  // First paint at the right column, before the browser shows anything.
  React.useLayoutEffect(() => {
    paint(s.current.pos, 0);
    return stop;
  }, [paint]);

  return (
    <div
      aria-hidden
      ref={railRef}
      className="pointer-events-none absolute inset-y-0 start-0 transition-opacity duration-300 will-change-transform"
      style={{ width: `${100 / columns}%`, opacity: col === null ? 0 : 1 }}
    >
      {/* Light the drop spills onto the dock (soft, blurred) */}
      <div
        ref={glassRef}
        className="absolute inset-x-0 top-0 mx-auto h-5 w-14 rounded-full bg-[radial-gradient(ellipse_at_top,rgb(var(--c-gold-400)/0.55),transparent_70%)] blur-[6px]"
      />
      {/* The liquid-glass drop on the dock's top edge, gliding over the icons */}
      <div
        ref={lineRef}
        className="absolute inset-x-0 -top-[1px] mx-auto h-[4px] w-8 overflow-hidden rounded-full border border-white/25 bg-[linear-gradient(90deg,rgb(var(--c-gold-600))_0%,rgb(var(--c-gold-300))_45%,rgb(var(--c-gold-100))_55%,rgb(var(--c-gold-500))_100%)] shadow-[0_0_12px_rgb(var(--c-gold-400)/0.9),0_0_3px_rgb(var(--c-gold-100)/0.9)]"
      >
        {/* glassy highlight along the top */}
        <span className="absolute inset-x-1 top-0 h-px bg-white/70" />
      </div>
    </div>
  );
});
