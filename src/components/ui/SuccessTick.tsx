'use client';

import * as React from 'react';
import { vibrate } from '@/features/camera/lib/fx';

/**
 * "It worked": a green circle pops in and the tick draws itself, with one soft haptic tap.
 * Pure CSS (see `.cv-pop` / `.cv-tick` in globals.css); reduced motion shows the finished tick.
 */
export function SuccessTick({ size = 56, haptic = true, className = '' }: { size?: number; haptic?: boolean; className?: string }) {
  React.useEffect(() => {
    if (haptic) vibrate([14, 60, 22]);
  }, [haptic]);
  return (
    <span aria-hidden="true" className={`cv-pop inline-grid place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path className="cv-tick" d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
