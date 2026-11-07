'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCameraStream } from '../hooks/useCameraStream';
import { compressFrameToWebP, type CompressResult } from '../lib/image-compressor';
import { playShutter, playLock, vibrate } from '../lib/fx';

export interface ScanAngle {
  id: number;
  key: 'front' | 'right' | 'rear' | 'left';
  shortTitle: string;
  title: string;
  instruction: string;
  direction: 'top' | 'right' | 'bottom' | 'left';
  coneAngle: number;
}

/**
 * 4 Mandatory Cardinal Angles strictly matching the 4-way 3D/top-down Car Compass
 * in the reference design (Top = Front, Right = Right Side, Bottom = Rear, Left = Left Side).
 * The user MUST capture all 4 angles in strict program-controlled sequence.
 */
export const SCAN_5_ANGLES: ScanAngle[] = [
  {
    id: 1,
    key: 'front',
    shortTitle: 'Oldi',
    title: 'Old tomon',
    instruction: 'Mashinaning OLD TOMONINI oltin yo‘riqnoma ichiga to‘g‘rilab suratga oling',
    direction: 'top',
    coneAngle: 0,
  },
  {
    id: 2,
    key: 'right',
    shortTitle: 'O‘ng',
    title: 'O‘ng tomon',
    instruction: 'Mashinaning O‘NG YON TOMONINI ramka markaziga to‘g‘rilab suratga oling',
    direction: 'right',
    coneAngle: 90,
  },
  {
    id: 3,
    key: 'rear',
    shortTitle: 'Orqa',
    title: 'Orqa tomon',
    instruction: 'Mashinaning ORQA TOMONINI oltin yo‘riqnoma ichiga to‘g‘rilab suratga oling',
    direction: 'bottom',
    coneAngle: 180,
  },
  {
    id: 4,
    key: 'left',
    shortTitle: 'Chap',
    title: 'Chap tomon',
    instruction: 'Mashinaning CHAP YON TOMONINI ramka markaziga to‘g‘rilab suratga oling',
    direction: 'left',
    coneAngle: 270,
  },
];

export interface LuxuryCarCompassProps {
  activeAngleId: number;
  completedAngles: number[];
  size?: 'sm' | 'md' | 'lg';
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
  const activeAngle =
    SCAN_5_ANGLES.find((a) => a.id === activeAngleId) || SCAN_5_ANGLES[0]!;

  const isTopActive = activeAngle.direction === 'top';
  const isRightActive = activeAngle.direction === 'right';
  const isBottomActive = activeAngle.direction === 'bottom';
  const isLeftActive = activeAngle.direction === 'left';

  const isTopDone = completedAngles.includes(1);
  const isRightDone = completedAngles.includes(2);
  const isBottomDone = completedAngles.includes(3);
  const isLeftDone = completedAngles.includes(4);

  const containerSizeClass =
    size === 'lg'
      ? 'h-56 w-56 sm:h-64 sm:w-64'
      : size === 'sm'
      ? 'h-32 w-32 sm:h-36 sm:w-36'
      : 'h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64';

  const carSizeClass =
    size === 'lg'
      ? 'h-40 w-24 sm:h-44 sm:w-28'
      : size === 'sm'
      ? 'h-22 w-14 sm:h-24 sm:w-16'
      : 'h-28 w-18 sm:h-34 sm:w-22 md:h-40 md:w-26 lg:h-44 lg:w-28';

  return (
    <div
      className={`relative ${containerSizeClass} flex items-center justify-center select-none pointer-events-none`}
      aria-label={`Kompas yo‘riqnomasi: ${activeAngle.title}`}
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

      {/* Directional Golden Bloom Behind Active Badge (Matches Reference Top Gold Halo 1:1) */}
      <div
        className={`absolute pointer-events-none transition-all duration-500 rounded-full blur-xl ${
          isTopActive
            ? '-top-1 start-1/2 -translate-x-1/2 w-24 h-12 bg-[#E5C175]/45'
            : isRightActive
            ? 'top-1/2 -end-1 -translate-y-1/2 w-12 h-24 bg-[#E5C175]/45'
            : isBottomActive
            ? '-bottom-1 start-1/2 -translate-x-1/2 w-24 h-12 bg-[#E5C175]/45'
            : 'top-1/2 -start-1 -translate-y-1/2 w-12 h-24 bg-[#E5C175]/45'
        }`}
      />

      {/* Center Top-Down Photorealistic Luxury Coupe (Fixed Upright so Arrows Match Car Sides 1:1) */}
      <div className={`relative z-10 ${carSizeClass} flex items-center justify-center`}>
        <img
          src="/images/camera/topdown_coupe.png"
          alt="3D Avtomobil Kompas Modeli"
          className="h-full w-full object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.98)] select-none pointer-events-none"
        />
      </div>

      {/* 1. TOP INDICATOR (FRONT / OLDI) — Strictly Non-Clickable */}
      <div
        className={`absolute top-1.5 start-1/2 -translate-x-1/2 h-7 w-12 sm:h-8 sm:w-14 md:h-9 md:w-16 rounded-2xl flex items-center justify-center transition-all duration-500 pointer-events-none ${
          isTopActive
            ? 'bg-gradient-to-b from-[#2E2310] to-[#14110A] text-[#F9E3A8] shadow-[0_-4px_22px_rgba(229,193,117,0.85),inset_0_1.5px_0_#F7DFA0] ring-1 ring-[#E5C175]/75 scale-105'
            : isTopDone
            ? 'bg-[#0E221B]/95 text-emerald-400 ring-1 ring-emerald-500/45 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
            : 'bg-[#141519]/95 text-white/35 ring-1 ring-white/[0.06]'
        }`}
      >
        {isTopDone && !isTopActive ? (
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.8]" />
        ) : (
          <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.6]" />
        )}
      </div>

      {/* 2. RIGHT INDICATOR (RIGHT SIDE / O'NG) — Strictly Non-Clickable */}
      <div
        className={`absolute top-1/2 end-1.5 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all duration-500 pointer-events-none ${
          isRightActive
            ? 'bg-gradient-to-s from-[#2E2310] to-[#14110A] text-[#F9E3A8] shadow-[4px_0_22px_rgba(229,193,117,0.85),inset_-1.5px_0_0_#F7DFA0] ring-1 ring-[#E5C175]/75 scale-105'
            : isRightDone
            ? 'bg-[#0E221B]/95 text-emerald-400 ring-1 ring-emerald-500/45 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
            : 'bg-[#141519]/95 text-white/35 ring-1 ring-white/[0.06]'
        }`}
      >
        {isRightDone && !isRightActive ? (
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.8]" />
        ) : (
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.4]" />
        )}
      </div>

      {/* 3. BOTTOM INDICATOR (REAR / ORQA) — Strictly Non-Clickable */}
      <div
        className={`absolute bottom-1.5 start-1/2 -translate-x-1/2 h-7 w-10 sm:h-8 sm:w-12 md:h-9 md:w-13 rounded-2xl flex items-center justify-center transition-all duration-500 pointer-events-none ${
          isBottomActive
            ? 'bg-gradient-to-t from-[#2E2310] to-[#14110A] text-[#F9E3A8] shadow-[0_4px_22px_rgba(229,193,117,0.85),inset_0_-1.5px_0_#F7DFA0] ring-1 ring-[#E5C175]/75 scale-105'
            : isBottomDone
            ? 'bg-[#0E221B]/95 text-emerald-400 ring-1 ring-emerald-500/45 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
            : 'bg-[#141519]/95 text-white/35 ring-1 ring-white/[0.06]'
        }`}
      >
        {isBottomDone && !isBottomActive ? (
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.8]" />
        ) : (
          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.4]" />
        )}
      </div>

      {/* 4. LEFT INDICATOR (LEFT SIDE / CHAP) — Strictly Non-Clickable */}
      <div
        className={`absolute top-1/2 start-1.5 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all duration-500 pointer-events-none ${
          isLeftActive
            ? 'bg-gradient-to-e from-[#2E2310] to-[#14110A] text-[#F9E3A8] shadow-[-4px_0_22px_rgba(229,193,117,0.85),inset_1.5px_0_0_#F7DFA0] ring-1 ring-[#E5C175]/75 scale-105'
            : isLeftDone
            ? 'bg-[#0E221B]/95 text-emerald-400 ring-1 ring-emerald-500/45 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
            : 'bg-[#141519]/95 text-white/35 ring-1 ring-white/[0.06]'
        }`}
      >
        {isLeftDone && !isLeftActive ? (
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.8]" />
        ) : (
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.4]" />
        )}
      </div>
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
  const { videoRef, isReady, permissionDenied, startCamera } = useCameraStream();

  // Strictly sequential program-controlled step index (0 -> 1 -> 2 -> 3)
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);
  const [capturedResults, setCapturedResults] = React.useState<Record<number, CompressResult>>({});
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [flash, setFlash] = React.useState(false);
  const [stepFeedback, setStepFeedback] = React.useState<string | null>(null);

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
  // The user can continue in portrait (rotation lock on, installed app locked to portrait, ...):
  // the camera UI is then rotated by CSS so it still reads as the landscape layout.
  const [forceLandscape, setForceLandscape] = React.useState(false);

  React.useEffect(() => {
    startCamera();
  }, [startCamera]);

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

  const handleShutterClick = async () => {
    if (isCapturing || showRotateHint) return;
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
          frameResult = await compressFrameToWebP(videoRef.current, 2048, 0.88);
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
            const nextAngle = SCAN_5_ANGLES[nextStepIndex]!;
            setStepFeedback(
              `${activeAngle.title} olindi (${nextStepIndex}/${SCAN_5_ANGLES.length}) — Endi: ${nextAngle.title}`
            );
            setCurrentStepIndex(nextStepIndex);
            setTimeout(() => setStepFeedback(null), 2200);
          } else {
            // All 4 required angles have been captured!
            playLock();
            vibrate([40, 60, 40]);
            setStepFeedback('Barcha 4 ta majburiy rakurs olindi!');
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
      className={`relative w-full h-full min-h-0 bg-[#050507] select-none overflow-hidden text-white ${className}`}
      style={
        forceLandscape && isPortrait
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100dvh',
              height: '100dvw',
              transformOrigin: 'top left',
              transform: 'translateX(100vw) rotate(90deg)',
              zIndex: 60,
            }
          : undefined
      }
    >
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
            {/* Ambient Luxury Gold Radial Glow */}
            <div className="pointer-events-none absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-[#D4AE62]/12 blur-[110px]" />

            {/* Animated 3D-Style Phone Rotation Stage */}
            <div className="relative mb-10 flex h-56 w-56 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#D4AE62]/15 animate-pulse" />
              <div className="absolute inset-5 rounded-full border border-dashed border-[#D4AE62]/25" />

              <svg
                viewBox="0 0 220 220"
                className="absolute inset-0 h-full w-full pointer-events-none"
                fill="none"
              >
                <path
                  d="M 110 22 A 88 88 0 0 0 22 110"
                  stroke="url(#rotate-trail-grad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="6 6"
                />
                <path
                  d="M 198 110 A 88 88 0 0 1 110 198"
                  stroke="url(#rotate-trail-grad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="6 6"
                />
                <defs>
                  <linearGradient id="rotate-trail-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F2D79E" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#D4AE62" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Animated Rotating Smartphone Frame (0deg Portrait -> -90deg Landscape) */}
              <motion.div
                animate={{
                  rotate: [0, -90, -90, 0],
                  scale: [0.96, 1.04, 1.04, 0.96],
                }}
                transition={{
                  duration: 3.4,
                  times: [0, 0.42, 0.78, 1],
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative z-10 flex h-36 w-20 flex-col items-center justify-between rounded-[22px] bg-gradient-to-b from-[#1C1E26] to-[#0B0C10] p-2 ring-2 ring-[#E5C175] shadow-[0_0_40px_rgba(212,174,98,0.45)]"
              >
                <div className="h-1 w-6 rounded-full bg-[#E5C175]/50" />
                <div className="relative flex h-full w-full items-center justify-center my-1.5 rounded-xl bg-[#07080B] overflow-hidden">
                  <div className="absolute top-1.5 start-1.5 h-3 w-3 border-t-2 border-s-2 border-[#E5C175] rounded-ss-sm" />
                  <div className="absolute top-1.5 end-1.5 h-3 w-3 border-t-2 border-e-2 border-[#E5C175] rounded-se-sm" />
                  <div className="absolute bottom-1.5 start-1.5 h-3 w-3 border-b-2 border-s-2 border-[#E5C175] rounded-es-sm" />
                  <div className="absolute bottom-1.5 end-1.5 h-3 w-3 border-b-2 border-e-2 border-[#E5C175] rounded-ee-sm" />
                  <Camera className="h-5 w-5 text-[#E5C175]" />
                </div>
                <div className="h-1 w-8 rounded-full bg-white/30" />
              </motion.div>
            </div>

            {/* Luxury Typography Prompt (Zero Buttons!) */}
            <div className="relative z-10 max-w-xs space-y-3">
              <p className="font-display text-[10px] font-semibold tracking-[0.35em] text-[#E5C175] uppercase">
                Smart Camera · Tavsiya
              </p>

              <h2 className="font-display text-xl sm:text-2xl font-light tracking-wide text-white leading-snug">
                Telefonni gorizontal holatga aylantiring
              </h2>

              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Avtomobilni to‘liq va aniq o‘lchamda suratga olish uchun telefoningizni yotiq (gorizontal) holatga burang. Aylantirganingizda kamera avtomatik ochiladi.
              </p>
            </div>

            {/* Passive Status Indicator (Non-clickable) */}
            <div className="relative z-10 mt-8 inline-flex items-center gap-2.5 rounded-full bg-white/[0.04] px-4 py-2 text-[11px] font-medium text-[#E5C175] ring-1 ring-[#D4AE62]/25 pointer-events-none">
              <span className="h-2 w-2 rounded-full bg-[#E5C175] animate-ping" />
              <span>Gorizontal holatga aylanishi kutilmoqda...</span>
            </div>

            {/* Escape hatch: rotation lock / portrait-locked app. Capture works in any orientation. */}
            <button
              type="button"
              onClick={() => setForceLandscape(true)}
              className="relative z-10 mt-5 cursor-pointer rounded-full bg-[#D4AE62] px-6 py-3 text-xs font-bold tracking-wide text-black transition active:scale-95"
            >
              Aylanmayapti? Shu holatda davom etish
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
      <div className="relative z-20 flex h-full w-full items-center justify-between gap-2 sm:gap-4 md:gap-6 px-3 sm:px-5 md:px-7 py-2.5 sm:py-4">
        {/* LEFT COLUMN: Top-Start Back Button & Center 3D Car Compass */}
        <div className="relative flex h-full w-[20%] min-w-[138px] max-w-[220px] shrink-0 flex-col items-center justify-center">
          {/* Top-Start Back Button (Matches Reference Image 1:1) */}
          <div className="absolute top-1 start-1 z-30">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Orqaga"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#15161B] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.8)] hover:bg-[#1E2028] hover:text-white active:scale-95 transition cursor-pointer"
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
          <div className="relative w-full h-full rounded-[22px] sm:rounded-[28px] md:rounded-[32px] overflow-hidden bg-[#0A0B0F] ring-[1.5px] ring-[#D4AE62]/65 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_24px_rgba(212,174,98,0.14)]">
            {/* Live Camera Stream Contained Strictly Inside Center Frame */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Camera Initializing Overlay */}
            {!isReady && !permissionDenied && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#08090C]/90 p-6 text-center">
                <div className="h-12 w-12 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin mb-3" />
                <p className="font-display text-xs sm:text-sm tracking-widest text-[#EDE8DF] uppercase">
                  Kamera ishga tushirilmoqda...
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
                  Kameraga ruxsat berilmadi
                </p>
                <p className="mt-1 max-w-xs text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                  Avtomobilni suratga olish uchun brauzerda kameraga ruxsat bering.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-4 rounded-xl bg-gold-gradient px-5 py-2 text-xs font-semibold text-black uppercase tracking-wider shadow-gold hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  Qayta urinish
                </button>
              </div>
            )}

            {/* Subtle Edge Vignette Inside Viewport */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />

            {/* 1:1 Reference Perspective Golden Floor Parking-Bay Alignment Grid (SVG) */}
            <svg
              viewBox="0 0 800 320"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[54%] w-full z-10"
              fill="none"
            >
              <defs>
                <linearGradient id="floor-lane-stroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E5C175" stopOpacity="0.22" />
                  <stop offset="55%" stopColor="#E5C175" stopOpacity="0.62" />
                  <stop offset="100%" stopColor="#F7DFA0" stopOpacity="0.88" />
                </linearGradient>
                <filter id="floor-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Left & Right Perspective Rails with Rounded Top & Bottom Corners */}
              <path
                d="M 275 284 L 185 284 Q 146 284 162 248 L 268 42 Q 278 22 304 22 L 352 22"
                stroke="url(#floor-lane-stroke)"
                strokeWidth="1.7"
                strokeLinecap="round"
                filter="url(#floor-glow)"
              />
              <path
                d="M 525 284 L 615 284 Q 654 284 638 248 L 532 42 Q 522 22 496 22 L 448 22"
                stroke="url(#floor-lane-stroke)"
                strokeWidth="1.7"
                strokeLinecap="round"
                filter="url(#floor-glow)"
              />

              {/* Center Baseline Highlight Bar */}
              <line
                x1="348"
                y1="284"
                x2="452"
                y2="284"
                stroke="#F7DFA0"
                strokeWidth="2.2"
                strokeLinecap="round"
                filter="url(#floor-glow)"
              />

              {/* Perspective Distance Tick Marks (3 Pairs: Far, Mid, Near) */}
              <line
                x1="242"
                y1="92"
                x2="305"
                y2="92"
                stroke="#E5C175"
                strokeOpacity="0.45"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <line
                x1="495"
                y1="92"
                x2="558"
                y2="92"
                stroke="#E5C175"
                strokeOpacity="0.45"
                strokeWidth="1.4"
                strokeLinecap="round"
              />

              <line
                x1="210"
                y1="160"
                x2="310"
                y2="160"
                stroke="#E5C175"
                strokeOpacity="0.65"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <line
                x1="490"
                y1="160"
                x2="590"
                y2="160"
                stroke="#E5C175"
                strokeOpacity="0.65"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              <line
                x1="176"
                y1="228"
                x2="290"
                y2="228"
                stroke="#F7DFA0"
                strokeOpacity="0.8"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <line
                x1="510"
                y1="228"
                x2="624"
                y2="228"
                stroke="#F7DFA0"
                strokeOpacity="0.8"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            {/* 4 Inset Golden Rounded L-Shaped Corner Brackets (1:1 with Reference Image) */}
            <div className="pointer-events-none absolute top-3.5 start-3.5 sm:top-4 sm:start-4 h-6 w-6 sm:h-7 sm:w-7 border-t-[2.5px] border-s-[2.5px] border-[#E5C175] rounded-ss-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
            <div className="pointer-events-none absolute top-3.5 end-3.5 sm:top-4 sm:end-4 h-6 w-6 sm:h-7 sm:w-7 border-t-[2.5px] border-e-[2.5px] border-[#E5C175] rounded-se-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
            <div className="pointer-events-none absolute bottom-3.5 start-3.5 sm:bottom-4 sm:start-4 h-6 w-6 sm:h-7 sm:w-7 border-b-[2.5px] border-s-[2.5px] border-[#E5C175] rounded-es-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />
            <div className="pointer-events-none absolute bottom-3.5 end-3.5 sm:bottom-4 sm:end-4 h-6 w-6 sm:h-7 sm:w-7 border-b-[2.5px] border-e-[2.5px] border-[#E5C175] rounded-ee-lg drop-shadow-[0_0_8px_rgba(229,193,117,0.8)] z-20" />

            {/* Step Transition Feedback Toast (Appears briefly when advancing between required angles) */}
            <AnimatePresence>
              {stepFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="pointer-events-none absolute top-4 inset-x-6 z-30 flex justify-center"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0D0F14]/90 px-4 py-1.5 text-xs font-medium text-[#F7DFA0] ring-1 ring-[#E5C175]/45 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                    <Sparkles className="h-3.5 w-3.5 text-[#E5C175]" />
                    <span>{stepFeedback}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COLUMN: Luxury White & Gold Ring Shutter Button (1:1 with Reference Image) */}
        <div className="relative flex h-full w-[13%] min-w-[78px] max-w-[132px] shrink-0 flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleShutterClick}
            disabled={isCapturing || showRotateHint}
            aria-label={`${activeAngle.title} rasmini olish`}
            className="group relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {/* Outer Glowing Golden Ring */}
            <span className="absolute inset-0 rounded-full ring-[2px] sm:ring-[2.5px] ring-[#E5C175] shadow-[0_0_28px_rgba(229,193,117,0.55),inset_0_0_12px_rgba(229,193,117,0.25)] transition-shadow duration-300 group-hover:shadow-[0_0_38px_rgba(229,193,117,0.9)]" />

            {/* Solid Pure White Inner Disc */}
            <span className="relative z-10 h-12 w-12 sm:h-14 sm:w-14 md:h-[68px] md:w-[68px] rounded-full bg-white shadow-[0_4px_18px_rgba(255,255,255,0.4)] transition-transform duration-200 group-hover:scale-[0.98] group-active:scale-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
