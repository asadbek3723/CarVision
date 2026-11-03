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
  1: 'rotateY(0deg) rotateX(4deg)', // Front 0°
  2: 'rotateY(35deg) rotateX(5deg)', // Front 3/4 (45°)
  3: 'rotateY(75deg) rotateX(2deg)', // Profile (90°)
  4: 'rotateY(125deg) rotateX(4deg)', // Rear 3/4 (135°)
  5: 'rotateY(180deg) rotateX(4deg)', // Rear 180°
  6: 'rotateY(215deg) rotateX(4deg)', // Rear 3/4 (225°)
  7: 'rotateY(255deg) rotateX(2deg)', // Passenger Profile (270°)
  8: 'rotateY(325deg) rotateX(5deg)', // Front 3/4 (315°)
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
      style={{ perspective: 1200 }}
    >
      {/* 3D Holographic Wireframe Chassis */}
      <div
        className={cn(
          'relative w-80 h-48 sm:w-[440px] sm:h-64 rounded-3xl border-2 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]',
          isAligned
            ? 'border-[#00E599] bg-[#00E599]/5 shadow-[0_0_40px_rgba(0,229,153,0.6),inset_0_0_20px_rgba(0,229,153,0.3)]'
            : 'border-[#19D3FF]/50 bg-[#19D3FF]/5 shadow-[0_0_20px_rgba(25,211,255,0.25)]'
        )}
        style={{
          transform: `${rotationTransform} scale(1.04)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease'
        }}
      >
        {/* Corner HUD Reticle Brackets */}
        <div className={cn(
          'absolute -top-2 -start-2 w-6 h-6 border-t-2 border-s-2 rounded-ts-lg transition-colors',
          isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]'
        )} />
        <div className={cn(
          'absolute -top-2 -end-2 w-6 h-6 border-t-2 border-e-2 rounded-te-lg transition-colors',
          isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]'
        )} />
        <div className={cn(
          'absolute -bottom-2 -start-2 w-6 h-6 border-b-2 border-s-2 rounded-bs-lg transition-colors',
          isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]'
        )} />
        <div className={cn(
          'absolute -bottom-2 -end-2 w-6 h-6 border-b-2 border-e-2 rounded-be-lg transition-colors',
          isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]'
        )} />

        {/* Wheels Guide Markers */}
        <div
          className={cn(
            'absolute -bottom-4 start-10 w-14 h-8 rounded-full border-2 transition-all flex items-center justify-center',
            isAligned ? 'border-[#00E599] shadow-[0_0_15px_rgba(0,229,153,0.5)]' : 'border-[#19D3FF]/70'
          )}
        >
          <div className={cn('w-2 h-2 rounded-full', isAligned ? 'bg-[#00E599]' : 'bg-[#19D3FF]/60')} />
        </div>

        <div
          className={cn(
            'absolute -bottom-4 end-10 w-14 h-8 rounded-full border-2 transition-all flex items-center justify-center',
            isAligned ? 'border-[#00E599] shadow-[0_0_15px_rgba(0,229,153,0.5)]' : 'border-[#19D3FF]/70'
          )}
        >
          <div className={cn('w-2 h-2 rounded-full', isAligned ? 'bg-[#00E599]' : 'bg-[#19D3FF]/60')} />
        </div>

        {/* Center Crosshair Target Ring */}
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              'w-12 h-12 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
              isAligned ? 'border-[#00E599] scale-110 shadow-[0_0_20px_rgba(0,229,153,0.6)]' : 'border-[#19D3FF]/40 border-dashed animate-spin'
            )}
            style={{ animationDuration: '10s' }}
          />
          <div
            className={cn(
              'absolute w-3 h-3 rounded-full transition-all',
              isAligned ? 'bg-[#00E599] scale-125 shadow-[0_0_10px_#00E599]' : 'bg-[#19D3FF]'
            )}
          />
        </div>

        {/* Roofline / Hood Slope Silhouette Indicator */}
        <div
          className={cn(
            'absolute top-4 inset-x-14 h-1 border-t-2 border-dashed transition-colors',
            isAligned ? 'border-[#00E599]' : 'border-[#19D3FF]/40'
          )}
        />

        {/* Status Text on Lock */}
        {isAligned && (
          <div className="absolute -top-7 px-3 py-0.5 rounded-full bg-[#00E599] text-[#0A0B0F] font-mono font-bold text-[10px] tracking-widest shadow-[0_0_15px_rgba(0,229,153,0.7)] animate-bounce">
            GREEN LOCK // READY
          </div>
        )}
      </div>
    </div>
  );
}
