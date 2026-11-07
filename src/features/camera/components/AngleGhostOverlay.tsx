'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface AngleGhostOverlayProps {
  /** Camera bearing around the car in degrees (0 = front, 90 = right side, clockwise). */
  bearing: number;
  /** Phone is level: the ghost turns emerald to say "shoot now". */
  aligned: boolean;
}

interface GhostView {
  src: string;
  /** The drawing shows the car's left side; mirror it for the right side. */
  mirror?: boolean;
}

/** Line drawings of the car for the 5 guided shots (white lines on transparent, tinted by CSS). */
const VIEWS: Record<number, GhostView> = {
  0: { src: '/images/camera-ghost/front.png' },
  90: { src: '/images/camera-ghost/side.png', mirror: true },
  135: { src: '/images/camera-ghost/rear-34.png' },
  180: { src: '/images/camera-ghost/rear.png' },
  315: { src: '/images/camera-ghost/front-34.png' },
};

function nearestView(bearing: number): GhostView {
  const b = ((bearing % 360) + 360) % 360;
  let best = 0;
  let bestD = Infinity;
  for (const k of Object.keys(VIEWS).map(Number)) {
    const d = Math.min(Math.abs(b - k), 360 - Math.abs(b - k));
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return VIEWS[best]!;
}

/**
 * Outline of a car for the current shot, drawn over the live camera so the user lines the real
 * car up with it. Cross-fades between the 5 angles.
 */
export function AngleGhostOverlay({ bearing, aligned }: AngleGhostOverlayProps) {
  const reduce = useReducedMotion();
  const view = React.useMemo(() => nearestView(bearing), [bearing]);
  const mask = `url(${view.src})`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view.src}
          className={`h-[82%] w-[92%] transition-colors duration-500 ${aligned ? 'text-emerald-300' : 'text-gold-300'}`}
          style={{
            backgroundColor: 'currentColor',
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            transform: view.mirror ? 'scaleX(-1)' : undefined,
            filter: aligned ? 'drop-shadow(0 0 4px rgba(110,231,183,0.45))' : 'drop-shadow(0 0 3px rgba(229,193,117,0.3))',
          }}
          initial={{ opacity: 0 }}
          animate={reduce || aligned ? { opacity: 0.95 } : { opacity: [0.75, 0.95, 0.75] }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={reduce || aligned ? { duration: 0.35 } : { opacity: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } }}
        />
      </AnimatePresence>
    </div>
  );
}
