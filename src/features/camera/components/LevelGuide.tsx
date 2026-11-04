'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import type { DeviceLevel } from '../lib/device-level';

interface LevelGuideProps {
  level: DeviceLevel | null;
  aligned: boolean;
}

/**
 * Horizon bar like a pro camera: two short bars on the sides that counter-rotate with the phone
 * and lock (emerald) when the horizon is level. Hidden without sensor data.
 */
export function LevelGuide({ level, aligned }: LevelGuideProps) {
  if (!level) return null;
  const rotate = Math.max(-35, Math.min(35, -level.roll));
  const tone = aligned ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]' : 'bg-[#E5C175]/70';
  return (
    <div className="pointer-events-none absolute inset-0 z-[11] flex items-center justify-center" aria-hidden="true">
      <motion.div
        className="flex w-[78%] items-center justify-between"
        animate={{ rotate }}
        transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 0.6 }}
      >
        <span className={`h-[2px] w-[9%] rounded-full transition-colors duration-300 ${tone}`} />
        <span className={`h-[2px] w-[9%] rounded-full transition-colors duration-300 ${tone}`} />
      </motion.div>
      {/* Fixed reference ticks */}
      <div className="absolute flex w-[78%] items-center justify-between">
        <span className="h-3 w-px bg-white/25" />
        <span className="h-3 w-px bg-white/25" />
      </div>
    </div>
  );
}
