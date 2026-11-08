'use client';

import * as React from 'react';

/**
 * Makes the site feel like an app on phones:
 *  - no pinch zoom (iOS Safari ignores `user-scalable=no`, so the gesture is cancelled here), and
 *  - no rubber-band: a swipe that nothing under the finger can scroll any further is cancelled,
 *    so the page never bounces past its top/bottom and fixed screens (render progress, camera)
 *    never reveal the page behind them. Real scrolling of the page and of inner lists still works.
 * `overscroll-behavior: none` in globals.css does the same on browsers that honour it; this covers
 * iOS versions and in-app browsers (Telegram, Instagram) that do not.
 */
export function TouchGuard() {
  React.useEffect(() => {
    let lastX = 0;
    let lastY = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastX = t.clientX;
      lastY = t.clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (!e.cancelable) return;
      // Two or more fingers = pinch zoom.
      if (e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      lastX = t.clientX;
      lastY = t.clientY;
      if (dx === 0 && dy === 0) return;
      if (!canScroll(e.target, dx, dy)) e.preventDefault();
    };

    const stopGesture = (e: Event) => e.preventDefault();

    const opts: AddEventListenerOptions = { passive: false };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, opts);
    // iOS Safari pinch gestures (non-standard events).
    document.addEventListener('gesturestart', stopGesture, opts);
    document.addEventListener('gesturechange', stopGesture, opts);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove, opts);
      document.removeEventListener('gesturestart', stopGesture, opts);
      document.removeEventListener('gesturechange', stopGesture, opts);
    };
  }, []);

  return null;
}

const SCROLLABLE = /(auto|scroll|overlay)/;

/** True when some element under the finger (or the page itself) can still scroll this way. */
function canScroll(target: EventTarget | null, dx: number, dy: number): boolean {
  const vertical = Math.abs(dy) >= Math.abs(dx);
  const root = document.scrollingElement ?? document.documentElement;

  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    // Range sliders, signature pads, the before/after slider... handle their own touches.
    if (el instanceof HTMLInputElement && el.type === 'range') return true;
    if (el === root || el === document.body) break;
    const style = getComputedStyle(el);
    if (vertical) {
      if (SCROLLABLE.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (dy > 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      }
    } else if (SCROLLABLE.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
      // scrollLeft is 0..-max in RTL, 0..max in LTR.
      const left = Math.abs(el.scrollLeft);
      const max = el.scrollWidth - el.clientWidth;
      const towardsStart = style.direction === 'rtl' ? dx < 0 : dx > 0;
      if (towardsStart ? left > 0 : left < max - 1) return true;
    }
  }

  // The page itself (unless a screen locked it with overflow: hidden).
  const locked = (s: CSSStyleDeclaration) => s.overflowY === 'hidden' || s.overflow === 'hidden';
  if (locked(getComputedStyle(document.documentElement)) || locked(getComputedStyle(document.body))) return false;
  if (!vertical) return false; // the page never scrolls sideways
  return dy > 0 ? root.scrollTop > 0 : root.scrollTop + window.innerHeight < root.scrollHeight - 1;
}
