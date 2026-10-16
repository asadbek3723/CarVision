'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated' | 'glass';
  isGlow?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'glass', isGlow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-200 border',
          {
            'bg-[#12141A]/90 border-[#232733]': variant === 'surface',
            'bg-[#181B22]/95 border-[#232733] shadow-lg': variant === 'elevated',
            'glass-panel': variant === 'glass',
            'border-[#19D3FF]/50 shadow-[0_0_20px_rgba(25,211,255,0.15)]': isGlow,
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
