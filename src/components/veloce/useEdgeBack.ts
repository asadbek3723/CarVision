'use client';

import * as React from 'react';
import { isStandalone } from '@/components/pwa/install';

/** Swipes that start this close to the edge need only a short sideways move; elsewhere the move must be clearly sideways. */
const EDGE_PX = 32;
const COMMIT_RATIO = 0.3;
const FLICK_PX_PER_MS = 0.45;
/** The screen underneath starts this far (fraction of the width) off to the side and glides into place. */
const PARALLAX = 0.28;
/** How dark the screen underneath is before the top screen leaves. */
const SHADE = 0.45;

function insideHorizontalScroller(el: HTMLElement, stop: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== stop; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const ox = getComputedStyle(node).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

/**
 * A damped spring from `from` to `to` (px, px/s). `bounce` true = a little overshoot and settle
 * (a cancelled swipe snapping back); false = critically damped, no overshoot (the screen leaving).
 */
function spring(from: number, to: number, velocity: number, bounce: boolean, onFrame: (x: number) => void, onDone: () => void): () => void {
  const k = bounce ? 380 : 420;
  const c = bounce ? 25 : 2 * Math.sqrt(420);
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
    last = now;
    v += (-k * (x - to) - c * v) * dt;
    x += v * dt;
    onFrame(x);
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 8) {
      onFrame(to);
      onDone();
      return;
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/**
 * iOS-style "swipe to go back" for screens opened on top of the tabs (a part, checkout, dashboard...).
 * Only inside the installed app: in a browser tab, Safari / Chrome already own that gesture, and two
 * back gestures fighting would feel broken.
 *
 * The screen follows the finger and the screen it came from is seen underneath, sliding in from the
 * side and brightening as the top one leaves. Past a third of the width, or on a flick, it springs
 * away and goes back; otherwise it springs back with a small bounce. It starts from the edge or from
 * anywhere with a clear sideways swipe (not over a sideways-scrolling row).
 *
 * `under` / `shade` are the previous screen and a dark veil over it; `canReveal` says whether that
 * screen really is the one a back step lands on.
 */
export function useEdgeBack(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  onBack: () => void,
  rtl: boolean,
  under?: React.RefObject<HTMLElement | null>,
  shade?: React.RefObject<HTMLElement | null>,
  canReveal?: () => boolean
) {
  const onBackRef = React.useRef(onBack);
  onBackRef.current = onBack;
  const canRevealRef = React.useRef(canReveal);
  canRevealRef.current = canReveal;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const underEl = under?.current;
    const shadeEl = shade?.current;
    let id = -1;
    let state: 'idle' | 'pending' | 'drag' = 'idle';
    let x0 = 0;
    let y0 = 0;
    let dx = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let edge = false;
    let moved = false;
    let reveal = false;
    let stop: (() => void) | null = null;
    let timer = 0;

    /** Puts the top screen `x` px to the side and keeps the screen underneath in step. */
    const apply = (x: number) => {
      const w = el.clientWidth || 1;
      el.style.transform = x ? `translate3d(${x}px,0,0)` : '';
      el.style.boxShadow = x ? `${rtl ? '' : '-'}18px 0 40px rgba(0,0,0,0.45)` : '';
      const p = Math.min(1, Math.abs(x) / w);
      const u = under?.current;
      if (u && reveal) u.style.transform = `translate3d(${(rtl ? 1 : -1) * (1 - p) * w * PARALLAX}px,0,0)`;
      const s = shade?.current;
      if (s && reveal) s.style.opacity = String(SHADE * (1 - p));
    };
    const hideUnder = () => {
      const u = under?.current;
      if (u && reveal) {
        u.style.visibility = 'hidden';
        u.style.transform = '';
      }
      if (shade?.current) shade.current.style.opacity = '0';
      reveal = false;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary || !isStandalone()) return;
      stop?.();
      stop = null;
      const w = el.clientWidth;
      if (w === 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable], [data-no-swipe]')) return;
      // A sideways-scrolling row (thumbnails, chips) keeps its own swipes.
      if (target && insideHorizontalScroller(target, el)) return;
      edge = rtl ? e.clientX > window.innerWidth - EDGE_PX : e.clientX - el.getBoundingClientRect().left < EDGE_PX;
      id = e.pointerId;
      moved = false;
      state = 'pending';
      x0 = lastX = e.clientX;
      y0 = e.clientY;
      lastT = e.timeStamp;
      dx = 0;
      v = 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id || state === 'idle') return;
      const ddx = e.clientX - x0;
      const ddy = e.clientY - y0;
      if (state === 'pending') {
        if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) {
          state = 'idle';
          return;
        }
        if (Math.abs(ddx) < 8) return;
        // Away from the edge it must be a clear sideways swipe towards "back", not a slanted scroll.
        const towards = rtl ? ddx < 0 : ddx > 0;
        if (!edge && (!towards || Math.abs(ddx) < Math.abs(ddy) * 1.6)) {
          if (Math.abs(ddy) > 10) state = 'idle';
          return;
        }
        state = 'drag';
        moved = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* gone */
        }
        // Show the screen this swipe goes back to, when there is one.
        const u = under?.current;
        reveal = Boolean(u && canRevealRef.current?.());
        if (u && reveal) u.style.visibility = 'visible';
      }
      // Only towards "back" (right in LTR, left in RTL).
      dx = rtl ? Math.min(0, ddx) : Math.max(0, ddx);
      const dt = Math.max(1, e.timeStamp - lastT);
      v = v * 0.6 + ((e.clientX - lastX) / dt) * 0.4;
      lastX = e.clientX;
      lastT = e.timeStamp;
      apply(dx);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const wasDrag = state === 'drag';
      state = 'idle';
      id = -1;
      if (!wasDrag) return;
      const w = el.clientWidth;
      const towardsBack = rtl ? v < 0 : v > 0;
      const go = Math.abs(dx) > w * COMMIT_RATIO || (towardsBack && Math.abs(v) > FLICK_PX_PER_MS);
      const sign = rtl ? -1 : 1;
      const vel = Math.abs(v) * 1000 * sign; // px/s along the swipe
      if (go) {
        // Springs the rest of the way off the screen, then goes back.
        stop = spring(
          Math.abs(dx),
          w,
          Math.max(0, Math.abs(vel)),
          false,
          (x) => apply(sign * x),
          () => {
            onBackRef.current();
            // If the new screen never arrives, bring this one back rather than leave a blank page.
            timer = window.setTimeout(() => {
              if (el.isConnected) {
                apply(0);
                hideUnder();
              }
            }, 1200);
          }
        );
      } else {
        // Not far enough: springs back with a little bounce.
        stop = spring(
          Math.abs(dx),
          0,
          -Math.abs(vel) * 0.3,
          true,
          (x) => apply(sign * Math.max(0, x)),
          () => {
            apply(0);
            hideUnder();
          }
        );
      }
    };

    // A swipe must not end as a tap on whatever was under the finger.
    const swallowClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener('click', swallowClick, true);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      stop?.();
      window.clearTimeout(timer);
      el.removeEventListener('click', swallowClick, true);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.style.transform = '';
      el.style.boxShadow = '';
      if (underEl) underEl.style.transform = '';
      if (shadeEl) shadeEl.style.opacity = '0';
    };
  }, [ref, enabled, rtl, under, shade]);
}
