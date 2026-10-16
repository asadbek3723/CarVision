'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BeforeAfterSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  isRtl?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  className?: string;
}

export function BeforeAfterSlider({
  beforeImageUrl,
  afterImageUrl,
  beforeLabel = 'Original',
  afterLabel = 'Tuned 4K',
  onInteractionStart,
  onInteractionEnd,
  className
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMove = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
      setSliderPosition(percentage);
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    onInteractionStart?.();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    onInteractionEnd?.();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full select-none overflow-hidden touch-none rounded-2xl bg-[#0A0B0F]',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 1. After (Tuned) Background Image */}
      <img
        src={afterImageUrl}
        alt="Tuned Car Preview"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* 2. Before (Original) Clipped Foreground Image */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImageUrl}
          alt="Original Car"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{
            width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
            maxWidth: 'none'
          }}
          draggable={false}
        />
      </div>

      {/* 3. The Vertical Dividing Line with Glowing Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 pointer-events-none"
        style={{
          left: `${sliderPosition}%`,
          transform: 'translateX(-50%)',
          boxShadow: '0 0 10px rgba(25, 211, 255, 0.8)'
        }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#0A0B0F] border-2 border-[#19D3FF] flex items-center justify-center shadow-[0_0_15px_rgba(25,211,255,0.6)]">
          <svg
            className="w-4 h-4 text-[#19D3FF]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
          </svg>
        </div>
      </div>

      {/* 4. Floating Labels (Auto-hide when dragging) */}
      <div
        className={cn(
          'absolute bottom-4 inset-x-4 flex justify-between pointer-events-none transition-opacity duration-300 z-10',
          isDragging ? 'opacity-0' : 'opacity-100'
        )}
      >
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0A0B0F]/80 backdrop-blur-md text-white border border-white/10 shadow-sm">
          {beforeLabel}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#19D3FF]/20 backdrop-blur-md text-[#19D3FF] border border-[#19D3FF]/40 shadow-sm">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
