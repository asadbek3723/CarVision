'use client';

import * as React from 'react';
import { isStandalone } from '@/components/pwa/install';

const EDGE_PX = 24;
const COMMIT_RATIO = 0.3;
const FLICK_PX_PER_MS = 0.45;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * iOS-style "swipe from the edge to go back" for screens opened on top of the tabs (a part,
 * checkout, dashboard...). Only inside the installed app: in a browser tab, Safari / Chrome already
 * own that edge gesture, and two back gestures fighting would feel broken. The screen follows the
 * finger and, past a third of the width or on a flick, slides away and goes back.
 */
export function useEdgeBack(ref: React.RefObject<HTMLElement | null>, enabled: boolean, onBack: () => void, rtl: boolean) {
  const onBackRef = React.useRef(onBack);
  onBackRef.current = onBack;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let id = -1;
    let state: 'idle' | 'pending' | 'drag' = 'idle';
    let x0 = 0;
    let y0 = 0;
    let dx = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;

    const set = (x: number, ms: number) => {
      el.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none';
      el.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary || !isStandalone()) return;
      const w = el.clientWidth;
      const fromEdge = rtl ? e.clientX > window.innerWidth - EDGE_PX : e.clientX - el.getBoundingClientRect().left < EDGE_PX;
      if (!fromEdge || w === 0) return;
      if ((e.target as HTMLElement | null)?.closest('[data-no-swipe]')) return;
      id = e.pointerId;
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
        state = 'drag';
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* gone */
        }
      }
      // Only towards "back" (right in LTR, left in RTL).
      dx = rtl ? Math.min(0, ddx) : Math.max(0, ddx);
      const dt = Math.max(1, e.timeStamp - lastT);
      v = v * 0.6 + ((e.clientX - lastX) / dt) * 0.4;
      lastX = e.clientX;
      lastT = e.timeStamp;
      set(dx, 0);
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
      if (go) {
        set(rtl ? -w : w, 220);
        window.setTimeout(() => {
          onBackRef.current();
          // The next screen renders in the same <main>: bring it back without animation.
          window.setTimeout(() => set(0, 0), 60);
        }, 200);
      } else {
        set(0, 260);
      }
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      set(0, 0);
    };
  }, [ref, enabled, rtl]);
}
