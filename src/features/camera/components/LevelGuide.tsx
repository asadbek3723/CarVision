'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import type { DeviceLevel } from '../lib/device-level';

interface LevelGuideProps {
  level: DeviceLevel | null;
  aligned: boolean;
}

/**
 * Horizon level like the iPhone camera: two short fixed marks on the sides and a line in the middle
 * that always stays parallel to the real horizon. Turn the phone until the middle line lines up with
 * the marks; then all three join into one green line. Hidden without sensor data.
 */
export function LevelGuide({ level, aligned }: LevelGuideProps) {
  if (!level) return null;
  // Phone turned clockwise by n° -> the real horizon is turned n° the other way on screen.
  const rotate = Math.max(-40, Math.min(40, -level.roll));
  const tone = aligned ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]' : 'bg-white/80';
  return (
    <div className="pointer-events-none absolute inset-0 z-[11] flex items-center justify-center" aria-hidden="true">
      <div className="flex w-[64%] max-w-[420px] items-center">
        <span className={`h-[2px] w-[13%] shrink-0 rounded-full transition-colors duration-300 ${tone}`} />
        <motion.span
          className={`h-[2px] flex-1 rounded-full transition-[margin,background-color,box-shadow] duration-300 ${tone} ${aligned ? 'mx-0' : 'mx-3'}`}
          animate={{ rotate }}
          transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.6 }}
        />
        <span className={`h-[2px] w-[13%] shrink-0 rounded-full transition-colors duration-300 ${tone}`} />
      </div>
    </div>
  );
}
