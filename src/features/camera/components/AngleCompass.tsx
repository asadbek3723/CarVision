import * as React from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AngleCompassProps {
  activeAngleId?: number;
  completedAngles?: number[];
  delay?: number;
  size?: number;
  autoPlay?: boolean;
  className?: string;
  onSelectAngle?: (angleId: number) => void;
}

const BASE_SIZE = 224;
const C = BASE_SIZE / 2;
const R = 86;

// 8 standard automotive capture angles
const ANGLES = [
  { id: 1, bearing: 0, label: 'Front' },
  { id: 2, bearing: 45, label: 'Front Left' },
  { id: 3, bearing: 90, label: 'Left Side' },
  { id: 4, bearing: 135, label: 'Rear Left' },
  { id: 5, bearing: 180, label: 'Rear' },
  { id: 6, bearing: 225, label: 'Rear Right' },
  { id: 7, bearing: 270, label: 'Right Side' },
  { id: 8, bearing: 315, label: 'Front Right' },
];

function dotPosition(bearing: number) {
  const rad = (bearing * Math.PI) / 180;
  return { x: C + R * Math.sin(rad), y: C - R * Math.cos(rad) };
}

const DOTS = ANGLES.map((a, index) => ({
  id: a.id,
  bearing: a.bearing,
  label: a.label,
  index,
  ...dotPosition(a.bearing),
}));

/**
 * 8-Angle Automotive HUD Compass:
 * - Central camera reticle with breathing cyan/emerald glow
 * - 360-degree orbital radar sweep beam (`cv-orbit`)
 * - Staggered breathing nodes (`cv-node`) with completed / active indicator states
 */
export function AngleCompass({
  activeAngleId: controlledActiveId,
  completedAngles: controlledCompleted,
  delay = 0,
  size = 320,
  autoPlay = false,
  className,
  onSelectAngle,
}: AngleCompassProps) {
  const [internalAngle, setInternalAngle] = React.useState(2);
  const [internalCompleted, setInternalCompleted] = React.useState<number[]>([1]);

  React.useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setInternalAngle((prev) => {
        const next = prev >= 8 ? 1 : prev + 1;
        setInternalCompleted(() => {
          if (next === 1) return [];
          return Array.from({ length: next - 1 }, (_, i) => i + 1);
        });
        return next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [autoPlay]);

  const activeAngleId = controlledActiveId !== undefined ? controlledActiveId : internalAngle;
  const completedAngles = controlledCompleted !== undefined ? controlledCompleted : internalCompleted;
  const completedSet = React.useMemo(() => new Set(completedAngles), [completedAngles]);

  const centerSize = Math.round(size * 0.25);
  const iconSize = Math.round(centerSize * 0.42);

  return (
    <div
      className={cn('cv-rise relative mx-auto select-none', className)}
      style={{ width: size, height: size, animationDelay: `${delay}ms` }}
    >
      <svg
        viewBox={`0 0 ${BASE_SIZE} ${BASE_SIZE}`}
        className="absolute inset-0 h-full w-full pointer-events-none"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cv-sweep-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#19D3FF" stopOpacity="0" />
            <stop offset="100%" stopColor="#19D3FF" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Outer and Inner Radar Track Rings */}
        <circle cx={C} cy={C} r={R} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <circle cx={C} cy={C} r={R - 26} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />

        {/* Continuous Orbital Radar Sweep */}
        <g className="cv-orbit" style={{ transformOrigin: `${C}px ${C}px` }}>
          <path
            d={`M ${C} ${C - R} A ${R} ${R} 0 0 1 ${C + R} ${C}`}
            stroke="url(#cv-sweep-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={C + R} cy={C} r="3.5" fill="#19D3FF" filter="drop-shadow(0 0 6px #19D3FF)" />
        </g>

        {/* 8 Angle Nodes */}
        {DOTS.map((dot) => {
          const isDone = completedSet.has(dot.id);
          const isActive = dot.id === activeAngleId;

          let ringColor = 'rgba(255, 255, 255, 0.15)';
          let dotColor = 'rgba(255, 255, 255, 0.35)';

          if (isDone) {
            ringColor = '#00E599';
            dotColor = '#00E599';
          } else if (isActive) {
            ringColor = '#19D3FF';
            dotColor = '#19D3FF';
          }

          return (
            <g key={dot.id} className="cursor-pointer pointer-events-auto" onClick={() => onSelectAngle?.(dot.id)}>
              {/* Outer halo */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r="10"
                fill="#12141A"
                stroke={ringColor}
                strokeWidth={isActive ? '2' : '1.2'}
                className="transition-colors duration-200"
              />
              {/* Inner core pulse */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={isActive ? 4.5 : 3}
                fill={dotColor}
                style={{
                  animation: isActive
                    ? 'cv-node 1.8s ease-in-out infinite'
                    : `cv-node 3.2s ease-in-out ${dot.index * 0.35}s infinite`,
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Center Target Core — Floating Glass Badge */}
      <div
        className="absolute inset-0 m-auto flex items-center justify-center rounded-2xl text-white shadow-2xl transition-transform"
        style={{
          width: centerSize,
          height: centerSize,
          background: 'linear-gradient(145deg, #181B22, #0A0B0F)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 12px 30px -6px rgba(0, 0, 0, 0.8), 0 0 25px rgba(25, 211, 255, 0.2)',
        }}
      >
        <span className="cv-breathe pointer-events-none absolute -inset-2.5 rounded-full bg-[#19D3FF]/20 blur-lg" />
        <Camera
          className="relative text-[#19D3FF]"
          style={{ width: iconSize, height: iconSize }}
        />
      </div>
    </div>
  );
}
