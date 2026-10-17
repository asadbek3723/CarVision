'use client';

import * as React from 'react';
import { BeforeAfterSlider } from '@/components/ui/BeforeAfterSlider';
import { cn } from '@/lib/utils';
import type { AngleRenderState } from '../types';
import { Sparkles } from 'lucide-react';

export interface VehicleViewportProps {
  renderState?: AngleRenderState | undefined;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  className?: string | undefined;
}

export function VehicleViewport({
  renderState,
  onInteractionStart,
  onInteractionEnd,
  className
}: VehicleViewportProps) {
  const originalUrl = renderState?.originalUrl ?? 'https://cdn.carvision.app/originals/demo/malibu-angle-2.webp';
  const tunedUrl = renderState?.output4kUrl;
  const isGenerating = renderState?.isGenerating ?? false;

  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center overflow-hidden bg-[#0A0B0F] select-none',
        className
      )}
      onPointerDown={onInteractionStart}
      onPointerUp={onInteractionEnd}
    >
      {/* 1. Luxury Dark Studio Radial Ambient Spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,211,255,0.06)_0%,rgba(10,11,15,0.85)_65%,#0A0B0F_100%)] pointer-events-none" />

      {/* 2. Studio Floor Reflection Horizon Line */}
      <div className="absolute bottom-[22%] inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* 3. Telemetry HUD Markers */}
      <div className="absolute top-20 start-6 pointer-events-none z-10 hidden sm:flex flex-col gap-1 text-[11px] font-mono text-[#94A3B8]/60">
        <span className="text-[#19D3FF]/80 font-bold tracking-wider">CHASSIS 3D // 4K PREVIEW</span>
        <span>LATENCY: &lt; 4MS • DCI-P3</span>
      </div>

      <div className="absolute top-20 end-6 pointer-events-none z-10 hidden sm:flex flex-col items-end gap-1 text-[11px] font-mono text-[#94A3B8]/60">
        <span className="text-[#19D3FF]/80 font-bold tracking-wider">ANGLE {renderState?.angleId ?? 2} OF 8</span>
        <span>CONTROLNET FITMENT: 100%</span>
      </div>

      {/* 4. Main Vehicle Canvas */}
      {tunedUrl ? (
        <BeforeAfterSlider
          beforeImageUrl={originalUrl}
          afterImageUrl={tunedUrl}
          beforeLabel="Factory Spec"
          afterLabel="CarVision 4K Tuned"
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
        />
      ) : (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <img
            src={originalUrl}
            alt="Vehicle Studio Viewport"
            className="w-full h-full object-contain pointer-events-none transition-transform duration-300 drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)]"
            draggable={false}
          />

          {/* AI Inpaint Laser Sweep when Generating */}
          {isGenerating && (
            <div className="absolute inset-x-8 top-12 bottom-12 overflow-hidden pointer-events-none flex flex-col items-center justify-center">
              <div className="w-full h-1 bg-[#19D3FF] shadow-[0_0_20px_#19D3FF,0_0_40px_#19D3FF] animate-laser" />
              <div className="absolute px-5 py-2.5 rounded-full bg-[#12141A]/90 border border-[#19D3FF]/50 backdrop-blur-xl text-white font-mono text-xs flex items-center gap-2 shadow-glow">
                <Sparkles className="w-4 h-4 text-[#19D3FF] animate-spin" />
                <span>FLUX AI INPAINTING IN PROGRESS...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
