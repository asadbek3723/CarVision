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
  { id: 1, label: '0° Front', shortLabel: '0°' },
  { id: 2, label: '45° F-3/4', shortLabel: '45°' },
  { id: 3, label: '90° Side', shortLabel: '90°' },
  { id: 4, label: '135° R-3/4', shortLabel: '135°' },
  { id: 5, label: '180° Rear', shortLabel: '180°' },
  { id: 6, label: '225° R-3/4', shortLabel: '225°' },
  { id: 7, label: '270° Side', shortLabel: '270°' },
  { id: 8, label: '315° F-3/4', shortLabel: '315°' },
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
        'glass-panel-dock rounded-full px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 max-w-[94vw] sm:max-w-none',
        className
      )}
    >
      <div className="pe-2 ps-1 text-[#94A3B8] flex items-center shrink-0">
        <Compass className="w-4 h-4 text-[#19D3FF] drop-shadow-[0_0_8px_rgba(25,211,255,0.7)]" />
      </div>

      {ANGLES.map((angle) => {
        const isActive = activeAngleId === angle.id;
        const isRendered = renderedAngles.has(angle.id);

        return (
          <button
            key={angle.id}
            onClick={() => {
              if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
                try {
                  navigator.vibrate(8);
                } catch {
                  // ignore
                }
              }
              onAngleSelect(angle.id);
            }}
            className={cn(
              'relative px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-1.5 cursor-pointer select-none active:scale-95',
              isActive
                ? 'bg-[#19D3FF] text-[#0A0B0F] font-bold shadow-[0_0_15px_rgba(25,211,255,0.6)]'
                : 'text-[#94A3B8] hover:text-[#F5F7FA] hover:bg-white/5'
            )}
            title={angle.label}
          >
            <span className="hidden sm:inline">{angle.label}</span>
            <span className="sm:hidden">{angle.shortLabel}</span>
            {isRendered && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#19D3FF] animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
