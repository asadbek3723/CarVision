'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Camera,
  ChevronUp,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCameraStream } from '../hooks/useCameraStream';
import { useDeviceLevel } from '../hooks/useDeviceLevel';
import { computeLevel } from '../lib/device-level';
import { useSubjectDetector } from '../hooks/useSubjectDetector';
import type { Subject } from '../lib/subject-classify';
import { AngleGhostOverlay } from './AngleGhostOverlay';
import { LevelGuide } from './LevelGuide';
import { compressFrameToWebP, type CompressResult } from '../lib/image-compressor';
import { playShutter, playLock, vibrate } from '../lib/fx';
import { GUIDED_SCAN_ANGLES, type GuidedScanAngle } from '@/components/camera/scan-angles';

export type ScanAngle = GuidedScanAngle;

/**
 * Viewport frame + status chip colour for what the camera sees. The chip sits on a dark base:
 * over a bright live feed a translucent tint alone is unreadable.
 */
const SUBJECT_FRAME: Record<Subject, { ring: string; chip: string; dot: string }> = {
  car: {
    ring: 'ring-emerald-400/70 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_28px_rgba(16,185,129,0.35)]',
    chip: 'ring-emerald-500/50 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  person: {
    ring: 'ring-red-500/70 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_28px_rgba(239,68,68,0.35)]',
    chip: 'ring-red-500/50 text-red-300',
    dot: 'bg-red-400',
  },
  other: {
    ring: 'ring-amber-400/70 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_24px_rgba(251,191,36,0.3)]',
    chip: 'ring-amber-400/50 text-amber-300',
    dot: 'bg-amber-400',
  },
};
const DEFAULT_FRAME_RING = 'ring-gold-500/65 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_24px_rgba(212,174,98,0.14)]';

/**
 * The 5 mandatory angles, shared with the upload flow (see `scan-angles.ts`).
 * Each one is placed on the compass ring at its real bearing around the car.
 */
export const SCAN_5_ANGLES: ScanAngle[] = GUIDED_SCAN_ANGLES;

export interface LuxuryCarCompassProps {
  activeAngleId: number;
  completedAngles: number[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Radius of the badge ring as a percentage of the compass box (matches the r=92 ring of the 240 viewBox). */
const COMPASS_RING_RADIUS = 38.3;

/** Position of a badge on the ring for a bearing (0° = top/front, clockwise). */
function compassPosition(bearing: number): React.CSSProperties {
  const rad = (bearing * Math.PI) / 180;
  return {
    left: `${50 + COMPASS_RING_RADIUS * Math.sin(rad)}%`,
    top: `${50 - COMPASS_RING_RADIUS * Math.cos(rad)}%`,
  };
}

/**
 * 1:1 Reference Program-Driven 3D/Top-Down Car Compass.
 * IMPORTANT: Directional indicators (^, >, v, <) are strictly non-clickable (pointer-events-none).
 * The program dictates which side of the vehicle must be photographed next.
 */
export function LuxuryCarCompass({
  activeAngleId,
  completedAngles,
  size = 'md',
}: LuxuryCarCompassProps) {
  const t = useTranslations('scanLive');
  const tAngle = useTranslations('scanModal.angles');
  const activeAngle =
    SCAN_5_ANGLES.find((a) => a.id === activeAngleId) || SCAN_5_ANGLES[0]!;

  const containerSizeClass =
    size === 'xl'
      ? 'h-[19rem] w-[19rem] xl:h-[24rem] xl:w-[24rem]'
      : size === 'lg'
      ? 'h-56 w-56 sm:h-64 sm:w-64'
      : size === 'sm'
      ? 'h-32 w-32 sm:h-36 sm:w-36'
      : 'h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64';

  const carSizeClass =
    size === 'xl'
      ? 'h-52 w-32 xl:h-64 xl:w-40'
      : size === 'lg'
      ? 'h-40 w-24 sm:h-44 sm:w-28'
      : size === 'sm'
      ? 'h-22 w-14 sm:h-24 sm:w-16'
      : 'h-28 w-18 sm:h-34 sm:w-22 md:h-40 md:w-26 lg:h-44 lg:w-28';

  return (
    <div
      className={`relative ${containerSizeClass} flex items-center justify-center select-none pointer-events-none`}
      aria-label={t('compassLabel', { angle: tAngle(`${activeAngle.key}.title`) })}
    >
      {/* Concentric Orbital Rings Matching Reference Image 1:1 */}
      <svg
        viewBox="0 0 240 240"
        className="absolute inset-0 h-full w-full overflow-visible pointer-events-none"
        fill="none"
      >
        <defs>
          <radialGradient id="compass-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4AE62" stopOpacity="0.12" />
            <stop offset="65%" stopColor="#D4AE62" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle Ambient Center Halo */}
        <circle cx="120" cy="120" r="108" fill="url(#compass-center-glow)" />

        {/* Outer Fine Orbital Ring passing cleanly through the 4 directional badges */}
        <circle
          cx="120"
          cy="120"
          r="92"
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth="1"
        />

        {/* Inner Fine Orbital Ring */}
        <circle
          cx="120"
          cy="120"
          r="72"
          stroke="rgba(212, 174, 98, 0.12)"
          strokeWidth="1"
        />
      </svg>

      {/* Golden bloom behind the active badge, at its real bearing */}
      <div
        className="absolute pointer-events-none transition-all duration-500 rounded-full blur-xl h-14 w-14 -translate-x-1/2 -translate-y-1/2 bg-gold-300/45"
        style={compassPosition(activeAngle.coneAngle)}
      />

      {/* Center Top-Down Photorealistic Luxury Coupe (Fixed Upright so Arrows Match Car Sides 1:1) */}
      <div className={`relative z-10 ${carSizeClass} flex items-center justify-center`}>
        <img
          src="/images/camera/topdown_coupe.png"
          alt={t('compassAlt')}
          className="h-full w-full object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.98)] select-none pointer-events-none"
        />
      </div>

      {/* One badge per required angle, placed on the ring at its real bearing. Never clickable. */}
      {SCAN_5_ANGLES.map((angle) => {
        const isActive = angle.id === activeAngle.id;
        const isDone = completedAngles.includes(angle.id);
        return (
          <div
            key={angle.id}
            data-angle={angle.slug}
            className={`absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-all duration-500 pointer-events-none ${
 isActive
 ? 'bg-gradient-to-b from-[#2E2310] to-[#14110A] text-[#F9E3A8] shadow-[0_0_22px_rgba(229,193,117,0.85),inset_0_1.5px_0_#F7DFA0] ring-1 ring-gold-300/75 scale-110'
                : isDone
                ? 'bg-[#0E221B]/95 text-emerald-400 ring-1 ring-emerald-500/45 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
                : 'bg-[#141519]/95 text-white/35 ring-1 ring-white/[0.06]'
            }`}
            style={compassPosition(angle.coneAngle)}
          >
            {isDone && !isActive ? (
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.8]" />
            ) : (
              <ChevronUp
                className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.6]"
                style={{ transform: `rotate(${angle.coneAngle}deg)` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SmartCameraLandscapeViewProps {
  onPhotoCaptured: (
    result: CompressResult,
    angleId: number,
    allCaptured?: Record<number, CompressResult>
  ) => void;
  onAllPhotosCaptured?: (allCaptured: Record<number, CompressResult>) => void;
  onClose?: () => void;
  className?: string;
}

export function SmartCameraLandscapeView({
  onPhotoCaptured,
  onAllPhotosCaptured,
  onClose,
  className = '',
}: SmartCameraLandscapeViewProps) {
  const t = useTranslations('scanLive');
  const tAngle = useTranslations('scanModal.angles');
  const { videoRef, stream, isReady, permissionDenied, startCamera } = useCameraStream();
  // Same stream, shown full screen and blurred behind the sharp frame.
  const bgVideoRef = React.useRef<HTMLVideoElement | null>(null);

  // Strictly sequential program-controlled step index (0 -> 1 -> ... -> 4)
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);
  const [capturedResults, setCapturedResults] = React.useState<Record<number, CompressResult>>({});
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [flash, setFlash] = React.useState(false);

  const completedAngles = React.useMemo(
    () => Object.keys(capturedResults).map(Number),
    [capturedResults]
  );

  const activeAngle =
    SCAN_5_ANGLES[currentStepIndex] || SCAN_5_ANGLES[0]!;

  // Orientation detection: Portrait vs Landscape.
  // iOS fires `orientationchange` BEFORE the viewport has its new size, and sometimes fires nothing
  // at all, so several signals are combined and a cheap poll acts as the safety net.
  const [isPortrait, setIsPortrait] = React.useState<boolean>(false);
  // The user can continue with the screen locked to portrait (rotation lock, installed app locked
  // to portrait, ...) and hold the phone sideways: the UI is then turned by CSS to face them.
  const [forceLandscape, setForceLandscape] = React.useState(false);
  const forced = forceLandscape && isPortrait;
  // Which way the phone is held in that case: 'ccw' = top edge to the left (the usual landscape),
  // 'cw' = top edge to the right. Read from the motion sensor; 'ccw' until it says otherwise.
  const [side, setSide] = React.useState<'ccw' | 'cw'>('ccw');

  // Phone-level guide (gyro). Purely advisory: the shutter is never blocked by it.
  const { level, aligned, needsPermission, requestPermission } = useDeviceLevel(
    !isCapturing,
    forced ? (side === 'ccw' ? 90 : 270) : null
  );
  // On-device object detection: car green, person red, anything else yellow (advisory only).
  const subject = useSubjectDetector(videoRef, isReady && !permissionDenied);
  const frame = subject ? SUBJECT_FRAME[subject] : null;
  const wasAligned = React.useRef(false);
  React.useEffect(() => {
    if (aligned && !wasAligned.current) vibrate(12);
    wasAligned.current = aligned;
  }, [aligned]);

  React.useEffect(() => {
    startCamera();
  }, [startCamera]);

  // The blurred backdrop plays the same camera stream as the sharp frame.
  React.useEffect(() => {
    const bg = bgVideoRef.current;
    if (!bg) return;
    bg.srcObject = stream;
    if (stream) void bg.play().catch(() => {});
  }, [stream]);

  // While the UI is turned by CSS, follow which way the phone is actually held (with a wide dead
  // zone so it never flips while the user is just tilting the phone).
  React.useEffect(() => {
    if (!forced || typeof window === 'undefined') return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
      const { roll } = computeLevel(e.beta, e.gamma, 0);
      if (roll > 55) setSide('ccw');
      else if (roll < -55) setSide('cw');
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [forced]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      setIsPortrait(h > w);
    };
    // After a rotation the new size arrives a moment later: re-read a few times.
    const readSoon = () => {
      read();
      [120, 350, 800].forEach((ms) => window.setTimeout(read, ms));
    };

    read();
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', readSoon);
    window.visualViewport?.addEventListener('resize', read);
    screen.orientation?.addEventListener?.('change', readSoon);
    const mediaQuery = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
    mediaQuery?.addEventListener?.('change', readSoon);
    const poll = window.setInterval(read, 500);

    return () => {
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', readSoon);
      window.visualViewport?.removeEventListener('resize', read);
      screen.orientation?.removeEventListener?.('change', readSoon);
      mediaQuery?.removeEventListener?.('change', readSoon);
      window.clearInterval(poll);
    };
  }, []);

  // Back to a real landscape: drop the CSS rotation.
  React.useEffect(() => {
    if (!isPortrait) setForceLandscape(false);
  }, [isPortrait]);

  const showRotateHint = isPortrait && !forceLandscape;

  const continueSideways = () => {
    // iOS gives motion access only from a tap: ask here, so the side and the level guide work.
    if (needsPermission) void requestPermission();
    setForceLandscape(true);
  };

  // The sharp camera is clipped to the on-screen rectangle of the centre frame; everything around
  // it shows the blurred copy. Measured in screen space, so it also works while the UI is turned.
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [clip, setClip] = React.useState('inset(50%)');
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const box = frameRef.current;
    if (!root || !box) return;
    let raf = 0;
    const measure = () => {
      const b = root.getBoundingClientRect();
      const r = box.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(box).borderTopLeftRadius) || 0;
      setClip(
        `inset(${Math.round(r.top - b.top)}px ${Math.round(b.right - r.right)}px ${Math.round(b.bottom - r.bottom)}px ${Math.round(r.left - b.left)}px round ${radius}px)`
      );
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    // A rotation settles a moment after the resize events: measure once more after it.
    const late = window.setTimeout(measure, 400);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(root);
    ro?.observe(box);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [forced, side, isPortrait]);

  const handleShutterClick = async () => {
    if (isCapturing || showRotateHint) return;
    // iOS only allows motion access from a tap: ask on the shutter, the level guide then switches on.
    if (needsPermission) void requestPermission();
    setIsCapturing(true);
    setFlash(true);

    try {
      playShutter();
      vibrate(60);
    } catch {
      // Audio or vibration unavailable
    }

    setTimeout(async () => {
      setFlash(false);
      try {
        let frameResult: CompressResult | null = null;

        if (videoRef.current && videoRef.current.videoWidth > 0) {
          // Screen locked to portrait but phone held sideways: turn the portrait frame upright.
          frameResult = await compressFrameToWebP(videoRef.current, 2048, 0.88, forced ? (side === 'ccw' ? -90 : 90) : 0);
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const grad = ctx.createRadialGradient(960, 540, 120, 960, 540, 960);
            grad.addColorStop(0, '#1B1E28');
            grad.addColorStop(1, '#07080B');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1920, 1080);
          }
          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), 'image/webp', 0.88)
          );
          if (blob) {
            frameResult = {
              blob,
              width: 1920,
              height: 1080,
              sizeBytes: blob.size,
            };
          }
        }

        if (frameResult) {
          const updatedMap: Record<number, CompressResult> = {
            ...capturedResults,
            [activeAngle.id]: frameResult,
          };
          setCapturedResults(updatedMap);

          // Notify parent of this single angle capture
          onPhotoCaptured(frameResult, activeAngle.id, updatedMap);

          const nextStepIndex = currentStepIndex + 1;
          if (nextStepIndex < SCAN_5_ANGLES.length) {
            setCurrentStepIndex(nextStepIndex);
          } else {
            // All 5 required angles have been captured!
            playLock();
            vibrate([40, 60, 40]);
            onAllPhotosCaptured?.(updatedMap);
          }
        }
      } catch {
        // Ignore capture error
      } finally {
        setIsCapturing(false);
      }
    }, 180);
  };

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-full min-h-0 bg-[#050507] select-none overflow-hidden text-white ${className}`}
      style={forced ? { position: 'fixed', inset: 0, zIndex: 60 } : undefined}
    >
      {/* Full-screen camera (screen space, never rotated): blurred everywhere, sharp inside the frame. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <video
          ref={bgVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full scale-[1.08] object-cover [filter:blur(22px)_brightness(0.55)_saturate(1.15)]"
        />
        <div className="absolute inset-0 bg-black/20" />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: clip, WebkitClipPath: clip }}
        />
      </div>

      {/* =====================================================================
          MANDATORY HORIZONTAL (LANDSCAPE) LOCK OVERLAY (WHEN PHONE IS VERTICAL)
          - Strictly buttonless ("tugma bo'lmasin")
          - Automatically disappears when phone rotates to landscape
          - Automatically reappears if phone rotates back to portrait
          ===================================================================== */}
      <AnimatePresence>
        {showRotateHint && (
          <motion.div
            key="mandatory-landscape-lock"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-[#050507] px-7 py-10 text-center select-none overflow-hidden"
          >
            <div className="pointer-events-none absolute top-1/2 start-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/10 blur-[100px] rtl:translate-x-1/2" />

            {/* Phone turning from portrait to landscape */}
            <motion.div
              aria-hidden
              animate={{ rotate: [0, -90, -90, 0] }}
              transition={{ duration: 3, times: [0, 0.4, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-28 w-16 items-center justify-center rounded-[18px] bg-[#111319] ring-2 ring-gold-300 shadow-[0_0_36px_rgba(212,174,98,0.4)]"
            >
              <Camera className="h-5 w-5 text-gold-300" />
            </motion.div>

            <h2 className="relative mt-12 max-w-xs font-display text-2xl font-light leading-snug text-white">
              {t('rotateTitle')}
            </h2>

            <button
              type="button"
              onClick={continueSideways}
              className="relative mt-8 min-h-14 w-full max-w-xs cursor-pointer rounded-full bg-gold-500 px-6 text-[15px] font-semibold text-black transition active:scale-95"
            >
              {t('rotateCta')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          2. FLASH SHUTTER EFFECT
          ===================================================================== */}
      {flash && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-200" />
      )}

      {/* =====================================================================
          3. 1:1 REFERENCE LANDSCAPE ARCHITECTURE (3-ZONE PURE BLACK MATTE LAYOUT)
          Left: Back Button + Program-Driven 3D Car Compass
          Center: Golden Framed Camera Viewport + 4 Corner Brackets + Perspective Floor Grid
          Right: Luxury White & Gold Ring Shutter Button
          ===================================================================== */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-between gap-2 sm:gap-4 md:gap-6 px-3 sm:px-5 md:px-7 py-2.5 sm:py-4"
        style={
          forced
            ? {
                inset: 'auto',
                top: 0,
                left: 0,
                width: '100dvh',
                height: '100dvw',
                transformOrigin: 'top left',
                transform: side === 'ccw' ? 'translateX(100dvw) rotate(90deg)' : 'translateY(100dvh) rotate(-90deg)',
              }
            : undefined
        }
      >
        {/* LEFT COLUMN: Top-Start Back Button & Center 3D Car Compass */}
        <div className="relative flex h-full w-[20%] min-w-[138px] max-w-[220px] shrink-0 flex-col items-center justify-center">
          {/* Top-Start Back Button (Matches Reference Image 1:1) */}
          <div className="absolute top-1 start-1 z-30">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={t('back')}
                className="flex h-11 w-11 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#15161B] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.8)] hover:bg-[#1E2028] hover:text-white active:scale-95 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>

          {/* Center: Program-Controlled 3D Car Compass (Non-clickable arrows!) */}
          <div className="mt-6 flex items-center justify-center">
            <LuxuryCarCompass
              activeAngleId={activeAngle.id}
              completedAngles={completedAngles}
            />
          </div>
        </div>

        {/* CENTER COLUMN: Framed Camera Viewport with Golden Corner Brackets & Perspective Floor Grid */}
        <div className="relative flex-1 h-[90%] sm:h-[92%] min-w-0 flex items-center justify-center">
          <div
            ref={frameRef}
            className={`relative w-full h-full rounded-[22px] sm:rounded-[28px] md:rounded-[32px] overflow-hidden ring-[1.5px] transition-[box-shadow] duration-500 ${frame ? frame.ring : DEFAULT_FRAME_RING}`}
          >
            {/* The sharp camera shows through here (see the full-screen layer above). */}

            {/* Camera Initializing Overlay */}
            {!isReady && !permissionDenied && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#08090C]/90 p-6 text-center">
                <div className="h-12 w-12 rounded-full border-2 border-t-gold-500 animate-spin mb-3" />
                <p className="font-display text-xs sm:text-sm tracking-widest text-foreground uppercase">
                  {t('starting')}
                </p>
              </div>
            )}

            {/* Permission Denied Fallback */}
            {permissionDenied && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#08090C]/95 p-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 flex items-center justify-center mb-3 text-red-400">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="font-display text-xs sm:text-sm font-semibold tracking-wider text-white uppercase">
                  {t('deniedTitle')}
                </p>
                <p className="mt-1 max-w-xs text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                  {t('deniedBody')}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-4 rounded-xl bg-gold-gradient px-5 py-2 text-xs font-semibold text-black uppercase tracking-wider shadow-gold hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  {t('retry')}
                </button>
              </div>
            )}

            {/* Perspective-correct car outline for the current angle + horizon level guide */}
            {isReady && !permissionDenied && (
              <>
                <AngleGhostOverlay bearing={activeAngle.coneAngle} aligned={aligned} subject={subject} />
                <LevelGuide level={level} aligned={aligned} />
                {frame && subject && (
                  <div className="pointer-events-none absolute inset-x-0 top-4 sm:top-5 z-20 flex justify-center px-14">
                    <span
                      aria-live="polite"
                      className={`inline-flex items-center gap-1.5 rounded-full bg-[#08090C]/75 px-3 py-1 text-xs font-medium ring-1 backdrop-blur-sm transition-colors duration-300 ${frame.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${frame.dot}`} />
                      {t(`subject.${subject}`)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Faint hint of the side to shoot (no chip, no buttons) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 sm:bottom-5 z-20 flex justify-center px-14">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={activeAngle.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: aligned ? 0.7 : 0.42, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4 }}
                  aria-live="polite"
                  className={`font-display text-[11px] sm:text-xs font-light uppercase tracking-[0.32em] [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] transition-colors duration-500 ${
 aligned ? 'text-emerald-200' : 'text-[#F4EBD6]'
 }`}
                >
                  {tAngle(`${activeAngle.key}.title`)}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* 4 Inset Golden Rounded L-Shaped Corner Brackets (1:1 with Reference Image) */}
            <div className="pointer-events-none absolute top-3.5 start-3.5 sm:top-4 sm:start-4 h-6 w-6 sm:h-7 sm:w-7 border-t-[2.5px] border-s-[2.5px] border-gold-300 rounded-ss-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
            <div className="pointer-events-none absolute top-3.5 end-3.5 sm:top-4 sm:end-4 h-6 w-6 sm:h-7 sm:w-7 border-t-[2.5px] border-e-[2.5px] border-gold-300 rounded-se-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
            <div className="pointer-events-none absolute bottom-3.5 start-3.5 sm:bottom-4 sm:start-4 h-6 w-6 sm:h-7 sm:w-7 border-b-[2.5px] border-s-[2.5px] border-gold-300 rounded-es-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
            <div className="pointer-events-none absolute bottom-3.5 end-3.5 sm:bottom-4 sm:end-4 h-6 w-6 sm:h-7 sm:w-7 border-b-[2.5px] border-e-[2.5px] border-gold-300 rounded-ee-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
          </div>
        </div>

        {/* RIGHT COLUMN: Luxury White & Gold Ring Shutter Button (1:1 with Reference Image) */}
        <div className="relative flex h-full w-[13%] min-w-[78px] max-w-[132px] shrink-0 flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleShutterClick}
            disabled={isCapturing || showRotateHint}
            aria-label={t('shutter', { angle: tAngle(`${activeAngle.key}.title`) })}
            className="group relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {/* Outer Glowing Golden Ring */}
            <span className="absolute inset-0 rounded-full ring-[2px] sm:ring-[2.5px] ring-gold-300 shadow-[0_0_28px_rgba(229,193,117,0.55),inset_0_0_12px_rgba(229,193,117,0.25)] transition-shadow duration-300 group-hover:shadow-[0_0_38px_rgba(229,193,117,0.9)]" />

            {/* Solid Pure White Inner Disc */}
            <span className="relative z-10 h-12 w-12 sm:h-14 sm:w-14 md:h-[68px] md:w-[68px] rounded-full bg-white shadow-[0_4px_18px_rgba(255,255,255,0.4)] transition-transform duration-200 group-hover:scale-[0.98] group-active:scale-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
