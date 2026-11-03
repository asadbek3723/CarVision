import { cn } from '@/lib/utils';

export interface ReticleBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ReticleProps {
  box: ReticleBox;
  ready: boolean;
  breathing?: boolean;
  className?: string;
}

/**
 * High-precision HUD Reticle with 4 L-shaped tactile corner brackets,
 * letterboxing mask cutout, and breathing/lock micro-animations.
 * Strictly uses CSS logical properties for Arabic RTL compliance.
 */
export function Reticle({ box, ready, breathing = true, className }: ReticleProps) {
  const borderColor = ready
    ? 'border-[#00E599] shadow-[0_0_15px_rgba(0,229,153,0.4)]'
    : 'border-[#19D3FF] shadow-[0_0_15px_rgba(25,211,255,0.35)]';

  return (
    <div
      className={cn(
        'pointer-events-none absolute transition-all duration-300',
        breathing && !ready && 'cv-reticle',
        className
      )}
      style={{
        insetInlineStart: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        boxShadow: '0 0 0 9999px rgba(10, 11, 15, 0.62)',
      }}
      aria-hidden="true"
    >
      {/* Top-Start Corner */}
      <div
        className={cn(
          'absolute top-0 start-0 h-9 w-9 border-t-4 border-s-4 rounded-ts-xl transition-all duration-200',
          borderColor
        )}
      />

      {/* Top-End Corner */}
      <div
        className={cn(
          'absolute top-0 end-0 h-9 w-9 border-t-4 border-e-4 rounded-te-xl transition-all duration-200',
          borderColor
        )}
      />

      {/* Bottom-Start Corner */}
      <div
        className={cn(
          'absolute bottom-0 start-0 h-9 w-9 border-b-4 border-s-4 rounded-bs-xl transition-all duration-200',
          borderColor
        )}
      />

      {/* Bottom-End Corner */}
      <div
        className={cn(
          'absolute bottom-0 end-0 h-9 w-9 border-b-4 border-e-4 rounded-be-xl transition-all duration-200',
          borderColor
        )}
      />

      {/* Center crosshair dot if ready */}
      {ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-[#00E599] shadow-[0_0_12px_#00E599] animate-ping" />
        </div>
      )}
    </div>
  );
}
