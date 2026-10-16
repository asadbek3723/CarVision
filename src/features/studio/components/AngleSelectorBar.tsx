'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';

export interface AngleSelectorBarProps {
  activeAngleId: number;
  onAngleSelect: (angleId: number) => void;
  renderedAngles?: Set<number>;
  className?: string;
}

const ANGLES = [
  { id: 1, label: '0° Front' },
  { id: 2, label: '45° F-3/4' },
  { id: 3, label: '90° Side' },
  { id: 4, label: '135° R-3/4' },
  { id: 5, label: '180° Rear' },
  { id: 6, label: '225° R-3/4' },
  { id: 7, label: '270° Side' },
  { id: 8, label: '315° F-3/4' },
];

export function AngleSelectorBar({
  activeAngleId,
  onAngleSelect,
  renderedAngles = new Set(),
  className
}: AngleSelectorBarProps) {
  return (
    <div
      className={cn(
        'glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-lg',
        className
      )}
    >
      <div className="pe-2 ps-1 text-[#94A3B8] flex items-center shrink-0">
        <Compass className="w-4 h-4 text-accent-cyan" />
      </div>

      {ANGLES.map((angle) => {
        const isActive = activeAngleId === angle.id;
        const isRendered = renderedAngles.has(angle.id);

        return (
          <button
            key={angle.id}
            onClick={() => onAngleSelect(angle.id)}
            className={cn(
              'relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-1.5',
              isActive
                ? 'bg-accent-cyan text-[#0A0B0F] shadow-[0_0_12px_rgba(25,211,255,0.4)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            )}
          >
            <span>{angle.label}</span>
            {isRendered && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
