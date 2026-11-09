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

// Slightly under-damped spring: a quick glide that settles with one soft wobble.
const STIFFNESS = 420;
const DAMPING = 28;
/** How much the glass stretches along the motion per (column / second) of speed, and its cap. */
const STRETCH_PER_SPEED = 0.085;
const MAX_STRETCH = 0.45;

/**
 * The dock's "liquid glass" selection: one frosted, gold-tinted capsule (with a glowing line on
 * top) shared by all tabs. It follows the finger while the pages are swiped, stretching like a
 * drop of liquid with the speed, and glides to the new tab on a spring when the finger lifts or a
 * tab is tapped. Driven with transforms outside React, so it never costs a re-render per frame.
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
      // Stretches along the motion and thins a little, like a moving drop.
      glass.style.transform = `scale(${1 + stretch}, ${1 - stretch * 0.32})`;
      line.style.transform = `scaleX(${1 + stretch * 1.6})`;
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
      {/* Glowing line on the dock's top edge */}
      <div
        ref={lineRef}
        className="absolute inset-x-0 top-0 mx-auto h-[2px] w-7 rounded-full bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 shadow-[0_0_10px_rgba(212,174,98,0.85),0_0_2px_rgba(255,236,190,0.9)]"
      />
      {/* Frosted, gold-tinted glass capsule behind the icon */}
      <div
        ref={glassRef}
        className="absolute inset-x-0 top-[6px] mx-auto h-[36px] w-[56px] overflow-hidden rounded-[18px] border border-[rgba(240,215,154,0.28)] bg-[linear-gradient(180deg,rgba(240,212,150,0.30)_0%,rgba(212,174,98,0.14)_55%,rgba(170,130,60,0.10)_100%)] shadow-[inset_0_1px_0_rgba(255,244,214,0.35),inset_0_-1px_0_rgba(90,60,10,0.35),0_8px_22px_-8px_rgba(212,174,98,0.6)] backdrop-blur-[10px] backdrop-saturate-[1.8]"
      >
        {/* Specular highlight across the top half, like real glass */}
        <span className="absolute inset-x-1 top-[1px] h-1/2 rounded-t-[16px] bg-gradient-to-b from-white/25 to-transparent" />
      </div>
    </div>
  );
});
