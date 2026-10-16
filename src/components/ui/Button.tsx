'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19D3FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0F]',
  {
    variants: {
      variant: {
        primary:
          'bg-[#19D3FF] text-[#0A0B0F] font-semibold hover:bg-[#00BEEA] shadow-[0_0_20px_rgba(25,211,255,0.3)] hover:shadow-[0_0_25px_rgba(25,211,255,0.5)]',
        secondary:
          'bg-[#181B22] text-white border border-[#232733] hover:bg-[#232733] hover:border-[#19D3FF]/50',
        glass:
          'glass-panel text-white hover:bg-white/10 hover:border-[#19D3FF]/40',
        ghost:
          'text-[#94A3B8] hover:text-white hover:bg-white/5',
        danger:
          'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        success:
          'bg-[#00E599] text-[#0A0B0F] font-semibold hover:bg-[#00CC88] shadow-[0_0_20px_rgba(0,229,153,0.3)]'
      },
      size: {
        sm: 'h-10 px-4 text-xs rounded-lg min-w-[44px]',
        md: 'h-12 px-6 text-sm rounded-xl min-w-[48px]', // Meets 48px touch target
        lg: 'h-14 px-8 text-base rounded-2xl min-w-[56px]',
        icon: 'h-12 w-12 rounded-xl min-w-[48px] min-h-[48px]'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
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
