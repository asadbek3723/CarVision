'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { GHOST_VIEWBOX, projectGhost } from '../lib/car-wireframe';

interface AngleGhostOverlayProps {
  /** Camera bearing around the car in degrees (0 = front, 90 = right side, clockwise). */
  bearing: number;
  /** Phone is level: the ghost turns emerald to say "shoot now". */
  aligned: boolean;
}

/**
 * Perspective-correct 3D outline of a car for the current shot, drawn over the live camera so the
 * user lines the real car up with it. Redrawn (cross-faded) for every one of the 5 angles.
 */
export function AngleGhostOverlay({ bearing, aligned }: AngleGhostOverlayProps) {
  const reduce = useReducedMotion();
  const ghost = React.useMemo(() => projectGhost(bearing), [bearing]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={bearing}
          viewBox={`0 0 ${GHOST_VIEWBOX.width} ${GHOST_VIEWBOX.height}`}
          className={`h-[88%] w-full transition-colors duration-500 ${
            aligned ? 'text-emerald-300' : 'text-[#E5C175]'
          }`}
          style={{
            filter: aligned
              ? 'drop-shadow(0 0 4px rgba(110,231,183,0.4))'
              : 'drop-shadow(0 0 3px rgba(229,193,117,0.25))',
          }}
          fill="none"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={
            reduce
              ? { opacity: 1, scale: 1 }
              : { opacity: aligned ? 1 : [0.8, 1, 0.8], scale: 1 }
          }
          exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.25 } }}
          transition={
            reduce || aligned
              ? { duration: 0.35 }
              : { opacity: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.35 } }
          }
        >
          {/* Ground contour: where the car "parks" in the frame */}
          <path
            d={ghost.ground}
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeWidth={1}
            strokeDasharray="3 7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {ghost.body.map((part, i) => (
            <path
              key={i}
              d={part.d}
              stroke="currentColor"
              strokeOpacity={part.opacity}
              strokeWidth={1.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}
