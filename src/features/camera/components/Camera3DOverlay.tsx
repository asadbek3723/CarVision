'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Camera3DOverlayProps {
  angleId: number;
  isAligned: boolean;
  className?: string;
}

// 8 angle rotation perspectives for vehicle bounding box
const ANGLE_ROTATIONS: Record<number, string> = {
  1: 'rotateY(0deg)', // Front 0°
  2: 'rotateY(45deg)', // Front 3/4 (45°)
  3: 'rotateY(90deg)', // Profile (90°)
  4: 'rotateY(135deg)', // Rear 3/4 (135°)
  5: 'rotateY(180deg)', // Rear 180°
  6: 'rotateY(225deg)', // Rear 3/4 (225°)
  7: 'rotateY(270deg)', // Passenger Profile (270°)
  8: 'rotateY(315deg)', // Front 3/4 (315°)
};

export function Camera3DOverlay({
  angleId,
  isAligned,
  className
}: Camera3DOverlayProps) {
  const rotationTransform = ANGLE_ROTATIONS[angleId] ?? 'rotateY(0deg)';

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none flex items-center justify-center transition-colors duration-300',
        className
      )}
      style={{ perspective: 1000 }}
    >
      {/* 3D Wireframe Silhouette Box */}
      <div
        className={cn(
          'relative w-72 h-44 sm:w-96 sm:h-56 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center',
          isAligned
            ? 'border-[#00E599] shadow-[0_0_30px_rgba(0,229,153,0.5)]'
            : 'border-[#19D3FF]/50 shadow-[0_0_15px_rgba(25,211,255,0.2)]'
        )}
        style={{
          transform: `${rotationTransform} scale(1.05)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease, border-color 0.3s ease, box-shadow 0.3s ease'
        }}
      >
        {/* Wheels guide markers */}
        <div
          className={cn(
            'absolute -bottom-3 start-8 w-12 h-6 rounded-full border-2 transition-colors',
            isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]/60'
          )}
        />
        <div
          className={cn(
            'absolute -bottom-3 end-8 w-12 h-6 rounded-full border-2 transition-colors',
            isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]/60'
          )}
        />

        {/* Center Crosshair Target */}
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full border transition-all duration-200',
              isAligned ? 'border-[#00E599] scale-110' : 'border-[#19D3FF]/40'
            )}
          />
          <div
            className={cn(
              'absolute w-2 h-2 rounded-full transition-colors',
              isAligned ? 'bg-[#00E599]' : 'bg-[#19D3FF]'
            )}
          />
        </div>

        {/* Hood / Roof Slope Silhouette Indicator */}
        <div
          className={cn(
            'absolute top-3 inset-x-12 h-1 border-t-2 border-dashed transition-colors',
            isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]/40'
          )}
        />
      </div>
    </div>
  );
}
