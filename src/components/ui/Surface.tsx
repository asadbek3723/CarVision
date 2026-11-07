import * as React from 'react';
import { cn } from '@/lib/utils';

type SurfaceTag = 'div' | 'section' | 'article' | 'aside' | 'li';

const tones = { 1: 'bg-surface-1', 2: 'bg-surface-2', 3: 'bg-surface-3' } as const;
const elevations = { 0: '', 1: 'shadow-e1', 2: 'shadow-e2', 3: 'shadow-e3', 4: 'shadow-e4' } as const;
const paddings = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' } as const;
// Hover raises exactly one level.
const hoverElevations = { 0: 'hover:shadow-e1', 1: 'hover:shadow-e2', 2: 'hover:shadow-e3', 3: 'hover:shadow-e4', 4: 'hover:shadow-e4' } as const;

export type SurfaceProps = React.HTMLAttributes<HTMLElement> & {
  as?: SurfaceTag | undefined;
  /** Surface lightness step: 1 card (default), 2 raised, 3 popover. */
  tone?: keyof typeof tones | undefined;
  elevation?: keyof typeof elevations | undefined;
  padding?: keyof typeof paddings | undefined;
  /** Card radius: lg 16 or xl 24 (default). */
  radius?: 'lg' | 'xl' | undefined;
  /** Adds the hover lift; use only when the whole card is clickable. */
  interactive?: boolean | undefined;
};

/** Borderless card: depth comes from surface tone and elevation, never from a border. */
export function Surface({
  as: Tag = 'div',
  tone = 1,
  elevation = 1,
  padding = 'md',
  radius = 'xl',
  interactive = false,
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <Tag
      className={cn(
        radius === 'xl' ? 'rounded-xl' : 'rounded-lg',
        tones[tone],
        elevations[elevation],
        paddings[padding],
        interactive &&
          cn('transition-[transform,box-shadow] duration-ui ease-brand hover:-translate-y-0.5 motion-reduce:hover:translate-y-0', hoverElevations[elevation]),
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
