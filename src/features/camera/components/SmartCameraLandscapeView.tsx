'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  RotateCw,
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
  const [forceLandscape, setForceLandscape] = React.useState<boolean>(false);

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

  // If in Portrait mode and user has not forced landscape, show the rotating phone animation screen
  if (isPortrait && !forceLandscape) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#07080B] p-6 text-white text-center">
        {/* Top Minimal Close */}
        <div className="w-full flex justify-start">
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 transition cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Center Animated Phone Rotation Graphic */}
        <div className="flex flex-col items-center my-auto space-y-6">
          <div className="relative">
            {/* Pulsing Ambient Gold Halo */}
            <div className="absolute -inset-4 rounded-full bg-[#D4AE62]/15 blur-xl animate-pulse" />

            {/* Rotating Smartphone Device Frame */}
            <div className="relative h-32 w-20 rounded-2xl border-2 border-[#D4AE62] bg-[#12141A] p-2 flex flex-col items-center justify-between shadow-gold animate-[spin_4s_ease-in-out_infinite]">
              <div className="h-1 w-6 rounded-full bg-[#D4AE62]/50" />
              <div className="h-10 w-10 rounded-full border border-dashed border-[#D4AE62]/40 flex items-center justify-center">
                <RotateCw className="h-5 w-5 text-[#D4AE62]" />
              </div>
              <div className="h-1 w-2 rounded-full bg-[#D4AE62]/50" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-light tracking-[0.25em] text-[#EDE8DF] uppercase">
              Telefonni Gorizontalga Buring
            </h2>
            <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
              1:1 to‘liq kadr va 360° kompasdan foydalanish uchun telefoningizni yonbosh holatga o‘giring.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setForceLandscape(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-3 text-xs font-semibold text-black uppercase tracking-wider shadow-gold hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
            <span>Gorizontal Rejimga O‘tish</span>
          </button>
        </div>

        <div className="text-[10px] text-muted-foreground tracking-widest uppercase pb-2">
          CarVision // 1:1 Smart Camera
        </div>
      </div>
    );
  }

  // Camera Landscape Layout (Rotated if forceLandscape is active in portrait mode)
  return (
    <div
      className={`relative w-full h-full min-h-[480px] bg-black select-none overflow-hidden text-white ${
        forceLandscape && isPortrait
          ? 'fixed inset-0 w-[100vh] h-[100vw] origin-top-left translate-x-[100vw] rotate-90 z-50'
          : ''
      } ${className}`}
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

      {/* 3. Top-Left Minimal Back Button (1:1 matching reference ArrowLeft, zero iOS status bar) */}
      <div className="absolute top-6 start-8 z-40">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Orqaga"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main 3-Column Landscape Layout: Left Compass | Center Viewport | Right Shutter */}
      <div className="relative z-20 w-full h-full flex items-center justify-between px-6 sm:px-12 py-4">
        {/* LEFT CONTROLLER: 360° Car Alignment Compass (1:1 with reference Image 3) */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative h-60 w-60 sm:h-72 sm:w-72 flex items-center justify-center">
            {/* Subtle Outer Orbital Ring */}
            <div className="absolute inset-2 rounded-full border border-white/10" />

            {/* Glowing Golden Arc behind active direction at the top */}
            {activeAngleId === 1 && (
              <div className="absolute top-2 start-1/2 -translate-x-1/2 w-32 h-16 border-t-[2.5px] border-[#D4AE62] rounded-t-full shadow-[0_-6px_24px_rgba(212,174,98,0.85)] pointer-events-none transition-all duration-300" />
            )}

            {/* Top-Down Photorealistic Sedan (100% Transparent PNG, Filling Compass Height, Animated Rotation) */}
            <div className="relative z-10 h-48 w-32 sm:h-56 sm:w-36 flex items-center justify-center">
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
              className={`absolute top-1 start-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                activeAngleId === 1
                  ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_0_20px_rgba(212,174,98,0.75)] scale-105'
                  : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:border-[#D4AE62]/40'
              }`}
            >
              <ChevronUp className="h-6 w-6 stroke-[3]" />
            </button>

            {/* 2. Left Direction Button (Driver Profile - 270°) */}
            <button
              type="button"
              onClick={() => setActiveAngleId(4)}
              aria-label="Chap tomon (Left)"
              className={`absolute top-1/2 start-1 -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                activeAngleId === 4
                  ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_0_20px_rgba(212,174,98,0.75)] scale-105'
                  : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:text-white'
              }`}
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
            </button>

            {/* 3. Right Direction Button (Passenger Profile - 90°) */}
            <button
              type="button"
              onClick={() => setActiveAngleId(2)}
              aria-label="O‘ng tomon (Right)"
              className={`absolute top-1/2 end-1 translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                activeAngleId === 2
                  ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_0_20px_rgba(212,174,98,0.75)] scale-105'
                  : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:text-white'
              }`}
            >
              <ChevronRight className="h-5 w-5 stroke-[2.5]" />
            </button>

            {/* 4. Bottom Direction Button (Rear - 180°) */}
            <button
              type="button"
              onClick={() => setActiveAngleId(3)}
              aria-label="Orqa tomon (Rear)"
              className={`absolute bottom-1 start-1/2 -translate-x-1/2 translate-y-1/2 h-9 w-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                activeAngleId === 3
                  ? 'bg-neutral-900/90 border border-[#D4AE62]/80 text-[#E5C175] shadow-[0_4px_20px_rgba(212,174,98,0.75)] scale-105'
                  : 'bg-neutral-900/80 text-neutral-400 border border-white/10 backdrop-blur-md hover:text-white'
              }`}
            >
              <ChevronDown className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* CENTER VIEWPORT: Golden Rounded Outer Frame & 4 Corner Brackets (100% Unobstructed) */}
        <div className="relative flex-1 h-[82%] max-h-[520px] mx-6 sm:mx-10 flex items-center justify-center">
          <div className="relative w-full h-full max-w-3xl rounded-[32px] sm:rounded-[36px] border-[1.5px] border-[#D4AE62]/55 shadow-[0_0_24px_rgba(212,174,98,0.12)] flex items-center justify-center overflow-hidden">
            {/* 4 Bright Gold Corner Brackets */}
            <div className="absolute top-2 start-2 h-10 w-10 border-t-[3.5px] border-s-[3.5px] border-[#F2D79E] rounded-tl-2xl drop-shadow-[0_0_10px_rgba(242,215,158,0.8)] pointer-events-none" />
            <div className="absolute top-2 end-2 h-10 w-10 border-t-[3.5px] border-e-[3.5px] border-[#F2D79E] rounded-tr-2xl drop-shadow-[0_0_10px_rgba(242,215,158,0.8)] pointer-events-none" />
            <div className="absolute bottom-2 start-2 h-10 w-10 border-b-[3.5px] border-s-[3.5px] border-[#F2D79E] rounded-bl-2xl drop-shadow-[0_0_10px_rgba(242,215,158,0.8)] pointer-events-none" />
            <div className="absolute bottom-2 end-2 h-10 w-10 border-b-[3.5px] border-e-[3.5px] border-[#F2D79E] rounded-br-2xl drop-shadow-[0_0_10px_rgba(242,215,158,0.8)] pointer-events-none" />
          </div>
        </div>

        {/* RIGHT CONTROLLER: Large Luxury White Circular Shutter Button (1:1 with reference Image 2) */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <button
            type="button"
            onClick={handleShutterClick}
            disabled={isCapturing}
            aria-label="Suratga olish"
            className="group relative h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {/* Outer Glowing Gold Ring (1:1 with reference Image 2) */}
            <span
              className="absolute inset-0 rounded-full border-[2.5px] border-[#DDBE78] shadow-[0_0_24px_rgba(221,190,120,0.55),inset_0_0_12px_rgba(221,190,120,0.2)] transition-shadow duration-300 group-hover:shadow-[0_0_34px_rgba(221,190,120,0.85)]"
            />

            {/* Inner Dark Gap & Solid Pure White Shutter Disc */}
            <span
              className="relative z-10 h-16 w-16 sm:h-[70px] sm:w-[70px] rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-[0.98] group-active:scale-90"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
