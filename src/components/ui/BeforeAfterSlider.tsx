'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BeforeAfterSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel?: string | undefined;
  afterLabel?: string | undefined;
  className?: string | undefined;
  onInteractionStart?: (() => void) | undefined;
  onInteractionEnd?: (() => void) | undefined;
}

export function BeforeAfterSlider({
  beforeImageUrl,
  afterImageUrl,
  beforeLabel = 'Factory Stock',
  afterLabel = 'CarVision 4K Tuned',
  className,
  onInteractionStart,
  onInteractionEnd,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleStart = React.useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;

      const update = (currentX: number) => {
        const cont = containerRef.current;
        if (!cont) return;
        const rect = cont.getBoundingClientRect();
        if (rect.width <= 0) return;
        const offset = Math.max(0, Math.min(currentX - rect.left, rect.width));
        const percentage = (offset / rect.width) * 100;
        setSliderPosition(percentage);
      };

      // Set position immediately on click/press
      update(clientX);
      setIsDragging(true);
      onInteractionStart?.();

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        update(e.clientX);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        onInteractionEnd?.();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches && e.touches[0]) {
          update(e.touches[0].clientX);
        }
      };

      const onTouchEnd = () => {
        setIsDragging(false);
        onInteractionEnd?.();
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      };

      window.addEventListener('mousemove', onMouseMove, { passive: false });
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    },
    [onInteractionStart, onInteractionEnd]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        handleStart(e.clientX);
      }}
      onTouchStart={(e) => {
        if (e.touches && e.touches[0]) {
          handleStart(e.touches[0].clientX);
        }
      }}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      className={cn(
        'relative w-full aspect-[16/9] select-none overflow-hidden rounded-3xl bg-[#070709] cursor-ew-resize shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95),0_0_50px_rgb(var(--c-gold-500)/0.04)]',
        className
      )}
    >
      {/* 1. Tuned (After) Base Image - 100% full width and height */}
      <img
        src={afterImageUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        draggable={false}
      />

      {/* 2. Stock (Before) Clipped Image - High-performance hardware-accelerated inset clipping */}
      <img
        src={beforeImageUrl}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
        }}
        draggable={false}
      />

      {/* 3. The Vertical Dividing Line with Glowing Neon Cyan Line and Draggable Handle */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-gold-500 via-neutral-50 to-gold-500 z-20 pointer-events-none shadow-glow-gold"
        style={{
          insetInlineStart: `${sliderPosition}%`,
          transform: 'translateX(-50%)',
        }}
      >
        {/* Center Circular Draggable Handle - Borderless with luminous glow */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#0D0F15] flex items-center justify-center shadow-[0_0_25px_rgb(var(--c-gold-500)/0.9),inset_0_0_12px_rgb(var(--c-gold-500)/0.35)] cursor-ew-resize pointer-events-none transition-transform duration-75',
            isDragging ? 'scale-115 shadow-[0_0_35px_rgb(var(--c-gold-500)/1),inset_0_0_15px_rgb(var(--c-gold-500)/0.5)]' : 'hover:scale-105'
          )}
        >
          <svg
            className="w-5 h-5 text-gold-500 drop-shadow-[0_0_6px_rgb(var(--c-gold-500)/0.9)] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
          </svg>
        </div>
      </div>

    </div>
  );
}
