'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated' | 'glass' | 'dock';
  isGlow?: boolean;
  glowColor?: 'cyan' | 'green' | 'gold';
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'glass', isGlow = false, glowColor = 'cyan', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-300 border relative overflow-hidden',
          {
            'bg-[#12141A]/90 border-[#232733] shadow-md': variant === 'surface',
            'bg-[#181B22]/95 border-[#232733] shadow-xl': variant === 'elevated',
            'glass-panel shadow-glass': variant === 'glass',
            'glass-panel-dock shadow-2xl': variant === 'dock',
            'border-[#19D3FF]/50 shadow-[0_0_25px_rgba(25,211,255,0.25)]': isGlow && glowColor === 'cyan',
            'border-[#00E599]/50 shadow-[0_0_25px_rgba(0,229,153,0.25)]': isGlow && glowColor === 'green',
            'border-[#E8C26A]/50 shadow-[0_0_25px_rgba(232,194,106,0.25)]': isGlow && glowColor === 'gold',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
