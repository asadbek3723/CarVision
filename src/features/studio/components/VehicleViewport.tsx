'use client';

import * as React from 'react';
import { BeforeAfterSlider } from '@/components/ui/BeforeAfterSlider';
import { cn } from '@/lib/utils';
import type { AngleRenderState } from '../types';

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

  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center overflow-hidden bg-[#0A0B0F] select-none',
        className
      )}
      onPointerDown={onInteractionStart}
      onPointerUp={onInteractionEnd}
    >
      {tunedUrl ? (
        <BeforeAfterSlider
          beforeImageUrl={originalUrl}
          afterImageUrl={tunedUrl}
          beforeLabel="Original"
          afterLabel="Tuned 4K"
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
        />
      ) : (
        <img
          src={originalUrl}
          alt="Vehicle Studio Viewport"
          className="w-full h-full object-contain pointer-events-none transition-transform duration-300"
          draggable={false}
        />
      )}
    </div>
  );
}
