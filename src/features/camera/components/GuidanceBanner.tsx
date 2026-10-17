import { cn } from '@/lib/utils';
import { CIcon, type CaptureIconName } from './CaptureIcons';
import { GUIDE_COLORS } from './guideTypes';

export type GuidanceIcon =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate'
  | 'sun'
  | 'car'
  | 'person'
  | 'hand'
  | 'focus'
  | 'check'
  | 'level';

export interface GuidanceBannerProps {
  message: string;
  icon?: GuidanceIcon;
  ready: boolean;
  dir?: 'front' | 'back';
  className?: string;
}

function getArrowAnimationClass(icon?: GuidanceIcon): string {
  switch (icon) {
    case 'up':
    case 'down':
      return 'cv-arrow-y';
    case 'left':
    case 'right':
      return 'cv-arrow-x';
    case 'zoom-in':
      return 'cv-arrow-zin';
    case 'zoom-out':
      return 'cv-arrow-zout';
    case 'rotate':
      return 'cv-arrow-spin';
    default:
      return '';
  }
}

export function GuidanceBanner({
  message,
  icon = 'car',
  ready,
  dir,
  className,
}: GuidanceBannerProps) {
  const iconName: CaptureIconName = ready ? 'check' : icon;
  const arrowAnim = getArrowAnimationClass(icon);

  return (
    <div
      className={cn(
        'cv-swap flex min-w-0 items-center gap-3 rounded-2xl px-5 py-3 backdrop-blur-xl border shadow-2xl transition-all duration-300',
        ready
          ? 'border-[#00E599]/50 bg-[#00E599]/15 shadow-[0_0_24px_rgba(0,229,153,0.3)]'
          : 'border-white/15 bg-[#0A0B0F]/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-300 shadow-md',
          ready ? 'bg-[#00E599] text-[#0A0B0F]' : 'bg-white/10 text-[#19D3FF]'
        )}
        style={{
          boxShadow: ready ? '0 0 16px rgba(0, 229, 153, 0.45)' : undefined,
        }}
      >
        <span
          className={cn('flex items-center justify-center', arrowAnim)}
          style={{ transform: dir === 'back' ? 'scaleX(-1)' : undefined }}
        >
          <CIcon name={iconName} size={22} strokeWidth={2.4} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[17px] leading-tight font-semibold tracking-[-0.01em] transition-colors',
            ready ? 'text-[#00E599]' : 'text-[#F5F7FA]'
          )}
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
        >
          {ready ? 'Ready — Hold Still' : message}
        </p>
      </div>

      {ready && (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: GUIDE_COLORS.ok }}
        />
      )}
    </div>
  );
}
