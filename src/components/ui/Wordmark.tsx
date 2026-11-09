import { cn } from '@/lib/utils';

/**
 * The CarVision wordmark: "CARVISION" in wide, light capitals with "DRIVE YOUR VISION" under it.
 * The brand name is not translated. The extra start padding balances the letter spacing that
 * trails the last letter, so the word sits truly centred.
 */
export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' | 'xl' }) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <span
        className={cn(
          'font-display font-light uppercase text-foreground',
          size === 'xl'
            ? 'text-[clamp(30px,8.6vw,58px)] tracking-[0.36em] ps-[0.36em]'
            : size === 'lg'
              ? 'text-3xl tracking-[0.42em] ps-[0.42em]'
              : 'text-[19px] tracking-[0.42em] ps-[0.42em]'
        )}
      >
        CarVision
      </span>
      <span
        className={cn(
          'font-display uppercase text-muted-foreground',
          size === 'xl'
            ? 'mt-4 text-[clamp(9px,2.6vw,14px)] tracking-[0.52em] ps-[0.52em]'
            : size === 'lg'
              ? 'mt-2.5 text-[10px] tracking-[0.5em] ps-[0.5em]'
              : 'mt-1.5 text-[8px] tracking-[0.5em] ps-[0.5em]'
        )}
      >
        Drive your vision
      </span>
    </span>
  );
}
