'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19D3FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0F] cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[#19D3FF] text-[#0A0B0F] font-bold hover:bg-[#00BEEA] shadow-[0_0_20px_rgba(25,211,255,0.3)] hover:shadow-[0_0_30px_rgba(25,211,255,0.55)] border border-[#19D3FF]/40',
        secondary:
          'bg-[#181B22] text-[#F5F7FA] border border-[#232733] hover:bg-[#232733] hover:border-[#19D3FF]/50 hover:text-white shadow-sm',
        glass:
          'glass-panel text-[#F5F7FA] hover:bg-white/10 hover:border-[#19D3FF]/50 hover:text-white shadow-glass',
        ghost:
          'text-[#94A3B8] hover:text-[#F5F7FA] hover:bg-white/5',
        gold:
          'bg-[#E8C26A] text-[#0A0B0F] font-bold hover:bg-[#D8AF55] shadow-[0_0_20px_rgba(232,194,106,0.3)] hover:shadow-[0_0_30px_rgba(232,194,106,0.5)] border border-[#E8C26A]/40',
        danger:
          'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-[#EF4444]/40',
        success:
          'bg-[#00E599] text-[#0A0B0F] font-bold hover:bg-[#00CC88] shadow-[0_0_20px_rgba(0,229,153,0.3)] hover:shadow-[0_0_30px_rgba(0,229,153,0.5)] border border-[#00E599]/40',
        outline:
          'border border-[#232733] text-[#F5F7FA] hover:border-[#19D3FF] hover:text-[#19D3FF] bg-transparent',
      },
      size: {
        sm: 'h-10 px-4 text-xs rounded-xl min-w-[44px]',
        md: 'h-12 px-6 text-sm rounded-xl min-w-[48px]', // Meets 48px touch target
        lg: 'h-14 px-8 text-base rounded-2xl min-w-[56px]',
        icon: 'h-12 w-12 rounded-xl min-w-[48px] min-h-[48px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Light tactile haptic pulse on click
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate(8);
        } catch {
          // ignore
        }
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
