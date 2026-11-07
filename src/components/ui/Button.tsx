import * as React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'gold' | 'ghost' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold ' +
  'transition-[transform,background-color,box-shadow,opacity] duration-micro ease-brand active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40 ' +
  'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45';

const variants: Record<ButtonVariant, string> = {
  // The one primary action per view.
  gold: 'bg-gold-500 text-ink shadow-glow-gold hover:bg-gold-400',
  // Toolbar / tertiary actions: no fill until hovered.
  ghost: 'bg-transparent text-foreground hover:bg-surface-2',
  // Secondary actions: soft filled tone.
  quiet: 'bg-surface-2 text-foreground hover:bg-surface-3',
  danger: 'bg-danger/15 text-danger-soft hover:bg-danger/25',
};

// Every size is at least 44px tall (tap target).
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-7 text-base',
};

export function buttonClasses({
  variant = 'gold',
  size = 'md',
  fullWidth = false,
  className,
}: { variant?: ButtonVariant | undefined; size?: ButtonSize | undefined; fullWidth?: boolean | undefined; className?: string | undefined } = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}

type CommonProps = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  fullWidth?: boolean | undefined;
  /** Shows a spinner, keeps the width, blocks clicks. */
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  children: React.ReactNode;
};

type AsButton = CommonProps & Omit<React.ComponentProps<'button'>, keyof CommonProps> & { href?: undefined };
type AsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, keyof CommonProps | 'href'> & { href: React.ComponentProps<typeof Link>['href'] };

export type ButtonProps = AsButton | AsLink;

function Content({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <>
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      )}
    </>
  );
}

/**
 * The single button of the app. Pass `href` to render a next/link with the same look.
 * Variants: gold (primary, one per view), quiet (secondary), ghost (tertiary), danger.
 */
export function Button(props: ButtonProps) {
  const { variant, size, fullWidth, loading = false, disabled = false, className, children } = props;
  const classes = buttonClasses({ variant, size, fullWidth, className });

  if (props.href !== undefined) {
    const { variant: _v, size: _s, fullWidth: _f, loading: _l, disabled: _d, className: _c, children: _ch, href, ...rest } = props;
    if (disabled || loading) {
      // A link cannot be disabled; render an inert placeholder with the same look.
      return (
        <span role="link" aria-disabled="true" aria-busy={loading || undefined} className={classes}>
          <Content loading={loading}>{children}</Content>
        </span>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        <Content loading={false}>{children}</Content>
      </Link>
    );
  }

  const { variant: _v, size: _s, fullWidth: _f, loading: _l, disabled: _d, className: _c, children: _ch, href: _h, type = 'button', ...rest } = props;
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      <Content loading={loading}>{children}</Content>
    </button>
  );
}
