import { cn } from '@/lib/utils';

/**
 * The CarVision wordmark: "CARVISION" in wide, light capitals with "DRIVE YOUR VISION" under it.
 * The brand name is not translated. The extra start padding balances the letter spacing that
 * trails the last letter, so the word sits truly centred.
 */
export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <span
        className={cn(
          'font-display font-light uppercase text-foreground',
          size === 'lg' ? 'text-3xl tracking-[0.42em] ps-[0.42em]' : 'text-[19px] tracking-[0.42em] ps-[0.42em]'
        )}
      >
        CarVision
      </span>
      <span
        className={cn(
          'font-display uppercase text-muted-foreground',
          size === 'lg' ? 'mt-2.5 text-[10px] tracking-[0.5em] ps-[0.5em]' : 'mt-1.5 text-[8px] tracking-[0.5em] ps-[0.5em]'
        )}
      >
        Drive your vision
      </span>
    </span>
  );
}
