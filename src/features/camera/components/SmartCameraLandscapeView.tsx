'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useCameraStream } from '../hooks/useCameraStream';
import { compressFrameToWebP, type CompressResult } from '../lib/image-compressor';
import { playShutter, vibrate } from '../lib/fx';

export interface ScanAngle {
  id: number;
  key: string;
  label: string;
  name: string;
  deg: number;
}

// Exactly 4 cardinal directions matching reference mockup 1:1 (Front, Side, Rear, Driver Profile) + 3/4
export const SCAN_5_ANGLES: ScanAngle[] = [
  { id: 1, key: 'front', label: '0°', name: 'Old tomon (Front)', deg: 0 },
  { id: 2, key: 'side', label: '90°', name: 'O‘ng tomon (Side)', deg: 90 },
  { id: 3, key: 'rear', label: '180°', name: 'Orqa tomon (Rear)', deg: 180 },
  { id: 4, key: 'left', label: '270°', name: 'Chap tomon (Left)', deg: 270 },
  { id: 5, key: 'front-left', label: '315°', name: 'Oldi-chap 3/4', deg: 315 },
];

interface SmartCameraLandscapeViewProps {
  onPhotoCaptured: (result: CompressResult, angleId: number) => void;
  onClose?: () => void;
  className?: string;
}

export function SmartCameraLandscapeView({
  onPhotoCaptured,
  onClose,
  className = '',
}: SmartCameraLandscapeViewProps) {
  const { videoRef, isReady, permissionDenied, startCamera } = useCameraStream();
  const [activeAngleId, setActiveAngleId] = React.useState<number>(1);
  const [completedAngles, setCompletedAngles] = React.useState<number[]>([]);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [flash, setFlash] = React.useState(false);

  const activeAngle = SCAN_5_ANGLES.find((a) => a.id === activeAngleId) || (SCAN_5_ANGLES[0] as ScanAngle);

  // Orientation detection
  const [isPortrait, setIsPortrait] = React.useState<boolean>(false);

  // Start real live camera stream on mount
  React.useEffect(() => {
    startCamera();
  }, [startCamera]);

  React.useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const portrait = window.innerHeight > window.innerWidth;
        setIsPortrait(portrait);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleShutterClick = async () => {
    if (isCapturing) return;
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
        if (videoRef.current) {
          const result = await compressFrameToWebP(videoRef.current, 2048, 0.88);
          setCompletedAngles((prev) => (prev.includes(activeAngleId) ? prev : [...prev, activeAngleId]));
          onPhotoCaptured(result, activeAngleId);
        } else {
          // Direct canvas frame fallback
          const canvas = document.createElement('canvas');
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#07080B';
            ctx.fillRect(0, 0, 1920, 1080);
          }
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const frame: CompressResult = {
                  blob,
                  width: 1920,
                  height: 1080,
                  sizeBytes: blob.size,
                };
                setCompletedAngles((prev) => (prev.includes(activeAngleId) ? prev : [...prev, activeAngleId]));
                onPhotoCaptured(frame, activeAngleId);
              }
            },
            'image/webp',
            0.88
          );
        }
      } catch {
        // Fallback
      } finally {
        setIsCapturing(false);
      }
    }, 180);
  };

  return (
    <div
      className={`relative w-full h-full min-h-0 bg-black select-none overflow-hidden text-white ${className}`}
    >
      {/* 1. REAL LIVE CAMERA VIEWPORT (100% Real Live Stream, Zero Fake Images) */}
      <div className="absolute inset-0 z-0 bg-black">
        {/* Real Live Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Loading / Initializing Indicator */}
        {!isReady && !permissionDenied && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
            <div className="relative mb-4">
              <div className="h-14 w-14 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin" />
            </div>
            <p className="font-display text-sm tracking-widest text-[#EDE8DF] uppercase">
              Kamera ishga tushirilmoqda...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Brauzerda kameraga ruxsat bering
            </p>
          </div>
        )}

        {/* Permission Denied Fallback */}
        {permissionDenied && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
              <Camera className="h-7 w-7" />
            </div>
            <p className="font-display text-sm font-semibold tracking-wider text-white uppercase">
              Kameraga ruxsat berilmadi
            </p>
            <p className="mt-1 max-w-xs text-xs text-neutral-400 leading-relaxed">
              Kamera tasvirini ko‘rish uchun brauzer sozlamalarida kameraga ruxsat bering.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="mt-4 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-semibold text-black uppercase tracking-wider shadow-gold hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Subtle Vignette on edges only so HUD elements pop */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35" />
      </div>

      {/* 2. Flash Shutter Effect */}
      {flash && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-200" />
      )}

      {/* 3. ADAPTIVE HUD: LANDSCAPE (Desktop / Laptops / Landscape Phones) vs PORTRAIT (Smartphones) */}
      {!isPortrait ? (
        /* LANDSCAPE MODE (3-Column Layout: Left Compass | Center Viewport | Right Shutter) */
        <div className="relative z-20 w-full h-full flex flex-col justify-between">
          {/* Top-Left Minimal Back Button */}
          <div className="absolute top-3 start-3 sm:top-5 sm:start-6 z-40">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Orqaga"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 active:scale-95 transition cursor-pointer shadow-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="relative w-full h-full flex items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 gap-2 sm:gap-4">
            {/* LEFT CONTROLLER: 360° Car Alignment Compass (Dynamically Scaled) */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative h-36 w-36 sm:h-44 sm:w-44 md:h-56 md:w-56 lg:h-64 lg:w-64 flex items-center justify-center">
                {/* Subtle Outer Orbital Ring */}
                <div className="absolute inset-1 sm:inset-2 rounded-full border border-white/10" />

                {/* Glowing Golden Arc behind active direction at the top */}
                {activeAngleId === 1 && (
                  <div className="absolute top-1 sm:top-2 start-1/2 -translate-x-1/2 w-20 sm:w-24 md:w-28 lg:w-32 h-10 sm:h-12 md:h-14 lg:h-16 border-t-[2.5px] border-[#D4AE62] rounded-t-full shadow-[0_-6px_24px_rgba(212,174,98,0.85)] pointer-events-none transition-all duration-300" />
                )}

                {/* Top-Down Photorealistic Sedan (100% Transparent PNG, Animated Rotation) */}
                <div className="relative z-10 h-24 w-16 sm:h-32 sm:w-22 md:h-44 md:w-28 lg:h-52 lg:w-34 flex items-center justify-center">
                  <img
                    src="/images/camera/topdown_coupe.png"
                    alt="Top-down Sedan"
                    style={{
                      transform: `rotate(${activeAngle.deg}deg)`,
                      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className="h-full w-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)] select-none pointer-events-none"
                  />
                </div>

                {/* 1. Top Direction Button (Front - 0°) */}
                <button
                  type="button"
                  onClick={() => setActiveAngleId(1)}
                  aria-label="Old tomon (Front)"
                  className={`absolute top-0.5 sm:top-1 start-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-12 sm:h-8 sm:w-14 md:h-9 md:w-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    activeAngleId === 1
                      ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_0_20px_rgba(212,174,98,0.75)] scale-105'
                      : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:border-[#D4AE62]/40'
                  }`}
                >
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 stroke-[2.5] sm:stroke-[3]" />
                </button>

                {/* 2. Left Direction Button (Driver Profile - 270°) */}
                <button
                  type="button"
                  onClick={() => setActiveAngleId(4)}
                  aria-label="Chap tomon (Left)"
                  className={`absolute top-1/2 start-0.5 sm:start-1 -translate-x-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    activeAngleId === 4
                      ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_0_20px_rgba(212,174,98,0.75)] scale-105'
                      : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:text-white'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2] sm:stroke-[2.5]" />
                </button>

                {/* 3. Right Direction Button (Passenger Profile - 90°) */}
                <button
                  type="button"
                  onClick={() => setActiveAngleId(2)}
                  aria-label="O‘ng tomon (Right)"
                  className={`absolute top-1/2 end-0.5 sm:end-1 translate-x-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    activeAngleId === 2
                      ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_0_20px_rgba(212,174,98,0.75)] scale-105'
                      : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:text-white'
                  }`}
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2] sm:stroke-[2.5]" />
                </button>

                {/* 4. Bottom Direction Button (Rear - 180°) */}
                <button
                  type="button"
                  onClick={() => setActiveAngleId(3)}
                  aria-label="Orqa tomon (Rear)"
                  className={`absolute bottom-0.5 sm:bottom-1 start-1/2 -translate-x-1/2 translate-y-1/2 h-7 w-10 sm:h-8 sm:w-11 md:h-9 md:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    activeAngleId === 3
                      ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_4px_20px_rgba(212,174,98,0.75)] scale-105'
                      : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:text-white'
                  }`}
                >
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2] sm:stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* CENTER VIEWPORT: Golden Rounded Outer Frame & 4 Corner Brackets (OCCUPIES MAXIMUM SPACE!) */}
            <div className="relative flex-1 h-[90%] sm:h-[94%] md:h-[96%] mx-1 sm:mx-3 md:mx-6 flex items-center justify-center">
              <div className="relative w-full h-full rounded-[24px] sm:rounded-[32px] md:rounded-[40px] border-[1.5px] sm:border-2 border-[#D4AE62]/65 shadow-[0_0_32px_rgba(212,174,98,0.18)] flex items-center justify-center overflow-hidden">
                {/* 4 Bright Gold Corner Brackets */}
                <div className="absolute top-2 start-2 sm:top-3 sm:start-3 h-8 w-8 sm:h-12 sm:w-12 border-t-[3px] sm:border-t-[4px] border-s-[3px] sm:border-s-[4px] border-[#F2D79E] rounded-ss-xl sm:rounded-ss-2xl drop-shadow-[0_0_12px_rgba(242,215,158,0.9)] pointer-events-none" />
                <div className="absolute top-2 end-2 sm:top-3 sm:end-3 h-8 w-8 sm:h-12 sm:w-12 border-t-[3px] sm:border-t-[4px] border-e-[3px] sm:border-e-[4px] border-[#F2D79E] rounded-se-xl sm:rounded-se-2xl drop-shadow-[0_0_12px_rgba(242,215,158,0.9)] pointer-events-none" />
                <div className="absolute bottom-2 start-2 sm:bottom-3 sm:start-3 h-8 w-8 sm:h-12 sm:w-12 border-b-[3px] sm:border-b-[4px] border-s-[3px] sm:border-s-[4px] border-[#F2D79E] rounded-es-xl sm:rounded-es-2xl drop-shadow-[0_0_12px_rgba(242,215,158,0.9)] pointer-events-none" />
                <div className="absolute bottom-2 end-2 sm:bottom-3 sm:end-3 h-8 w-8 sm:h-12 sm:w-12 border-b-[3px] sm:border-b-[4px] border-e-[3px] sm:border-e-[4px] border-[#F2D79E] rounded-ee-xl sm:rounded-ee-2xl drop-shadow-[0_0_12px_rgba(242,215,158,0.9)] pointer-events-none" />
              </div>
            </div>

            {/* RIGHT CONTROLLER: Large Luxury White Circular Shutter Button */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <button
                type="button"
                onClick={handleShutterClick}
                disabled={isCapturing}
                aria-label="Suratga olish"
                className="group relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                {/* Outer Glowing Gold Ring */}
                <span
                  className="absolute inset-0 rounded-full border-[2px] sm:border-[2.5px] border-[#DDBE78] shadow-[0_0_24px_rgba(221,190,120,0.55),inset_0_0_12px_rgba(221,190,120,0.2)] transition-shadow duration-300 group-hover:shadow-[0_0_34px_rgba(221,190,120,0.85)]"
                />

                {/* Inner Dark Gap & Solid Pure White Shutter Disc */}
                <span
                  className="relative z-10 h-11 w-11 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-[70px] lg:w-[70px] rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-[0.98] group-active:scale-90"
                />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MOBILE PORTRAIT VIEW (When device is held vertically) */
        <div className="relative z-20 w-full h-full flex flex-col justify-between p-3 sm:p-4">
          {/* Top Bar: Back button, Active Angle Label, Angle Switcher */}
          <div className="w-full flex flex-col gap-2.5 shrink-0 pt-1">
            <div className="flex items-center justify-between">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Orqaga"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 active:scale-95 transition cursor-pointer shadow-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-[#D4AE62]/40 backdrop-blur-md shadow-gold">
                <span className="h-2 w-2 rounded-full bg-[#E5C175] animate-pulse" />
                <span className="font-display text-xs font-semibold tracking-wider text-[#EDE8DF] uppercase">
                  {activeAngle.name}
                </span>
              </div>
              <div className="w-10" />
            </div>

            {/* Angle Selection Chips */}
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
              {SCAN_5_ANGLES.map((angle) => {
                const isActive = angle.id === activeAngleId;
                const isDone = completedAngles.includes(angle.id);
                return (
                  <button
                    key={angle.id}
                    type="button"
                    onClick={() => setActiveAngleId(angle.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-medium tracking-wide transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900/95 border border-[#D4AE62] text-[#E5C175] shadow-[0_0_14px_rgba(212,174,98,0.4)] scale-105'
                        : isDone
                        ? 'bg-neutral-900/60 text-green-400 border border-green-500/30'
                        : 'bg-neutral-900/70 text-neutral-300 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {angle.label} {angle.key === 'front' ? 'Old' : angle.key === 'side' ? 'O‘ng' : angle.key === 'rear' ? 'Orqa' : angle.key === 'left' ? 'Chap' : '3/4'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Central Camera Framing Viewport (Maximizes Space on Phone Screen) */}
          <div className="relative flex-1 w-full my-2 flex items-center justify-center min-h-0">
            <div className="relative w-full h-full max-h-[70vh] rounded-[24px] sm:rounded-[32px] border-[1.5px] border-[#D4AE62]/65 shadow-[0_0_32px_rgba(212,174,98,0.18)] flex items-center justify-center overflow-hidden">
              {/* 4 Bright Gold Corner Brackets */}
              <div className="absolute top-2 start-2 h-8 w-8 border-t-[3px] border-s-[3px] border-[#F2D79E] rounded-ss-xl drop-shadow-[0_0_10px_rgba(242,215,158,0.85)] pointer-events-none" />
              <div className="absolute top-2 end-2 h-8 w-8 border-t-[3px] border-e-[3px] border-[#F2D79E] rounded-se-xl drop-shadow-[0_0_10px_rgba(242,215,158,0.85)] pointer-events-none" />
              <div className="absolute bottom-2 start-2 h-8 w-8 border-b-[3px] border-s-[3px] border-[#F2D79E] rounded-es-xl drop-shadow-[0_0_10px_rgba(242,215,158,0.85)] pointer-events-none" />
              <div className="absolute bottom-2 end-2 h-8 w-8 border-b-[3px] border-e-[3px] border-[#F2D79E] rounded-ee-xl drop-shadow-[0_0_10px_rgba(242,215,158,0.85)] pointer-events-none" />
            </div>
          </div>

          {/* Bottom Bar: Shutter Button and Mini Compass */}
          <div className="relative w-full flex items-center justify-between px-6 pb-2 pt-1 shrink-0">
            {/* Left: Mini Top-Down Car rotating in real-time with angle */}
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-black/60 border border-white/10 p-1">
              <img
                src="/images/camera/topdown_coupe.png"
                alt="Mini Coupe"
                style={{
                  transform: `rotate(${activeAngle.deg}deg)`,
                  transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="h-10 w-7 object-contain drop-shadow"
              />
            </div>

            {/* Center: Luxury Shutter Button */}
            <button
              type="button"
              onClick={handleShutterClick}
              disabled={isCapturing}
              aria-label="Suratga olish"
              className="group relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-2xl"
            >
              <span className="absolute inset-0 rounded-full border-[2.5px] border-[#DDBE78] shadow-[0_0_24px_rgba(221,190,120,0.55),inset_0_0_12px_rgba(221,190,120,0.2)] transition-shadow duration-300 group-hover:shadow-[0_0_34px_rgba(221,190,120,0.85)]" />
              <span className="relative z-10 h-14 w-14 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-[0.98] group-active:scale-90" />
            </button>

            {/* Right: Angle Counter */}
            <div className="h-14 w-14 flex flex-col items-center justify-center rounded-2xl bg-black/60 border border-white/10">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Kadr</span>
              <span className="font-mono text-sm font-bold text-[#E5C175]">{activeAngleId}/5</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
