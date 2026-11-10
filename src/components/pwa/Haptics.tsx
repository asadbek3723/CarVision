'use client';

import * as React from 'react';
import { lastHapticAt, vibrate } from '@/features/camera/lib/fx';

/** Things a finger presses: a native app taps back on every one of them. */
const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="menuitem"], summary, label[for], input[type="checkbox"], input[type="radio"]';

/**
 * Light haptic tap on every button / link / tab press, like a native app. Works on Android (vibration)
 * and on iPhone with iOS 18+ (system haptic); other phones simply give no feedback.
 * Screens that already vibrate on their own (the parts wheel, the shutter) are not doubled, and any
 * element can opt out with `data-no-haptic`.
 */
export function Haptics() {
  React.useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    const onClick = (e: MouseEvent) => {
      if (!e.isTrusted) return; // only real taps, never script-made clicks
      if (Date.now() - lastHapticAt() < 80) return;
      const el = e.target instanceof Element ? e.target.closest(PRESSABLE) : null;
      if (!el || el.closest('[data-no-haptic]')) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      vibrate(8);
    };
    // Bubble phase on purpose: component handlers (which may vibrate themselves) run first.
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
