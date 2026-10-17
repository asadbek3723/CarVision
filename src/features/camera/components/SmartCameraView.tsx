'use client';

import * as React from 'react';
import { useCameraStream } from '../hooks/useCameraStream';
import { useDeviceSensors, type GuidanceInstruction } from '../hooks/useDeviceSensors';
import { CarGuide3D } from './CarGuide3D';
import { Reticle, type ReticleBox } from './Reticle';
import { GuidanceBanner, type GuidanceIcon } from './GuidanceBanner';
import { CIcon } from './CaptureIcons';
import { compressFrameToWebP, type CompressResult } from '../lib/image-compressor';
import { analyzeFrameLuma } from '../lib/luma-analyzer';
import { isMuted, setMuted, unlockAudio, playLock, playShutter, playError, vibrate } from '../lib/fx';
import type { GuideState } from './guideTypes';
import { Button } from '@/components/ui/Button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartCameraViewProps {
  currentAngleId: number;
  totalAngles?: number;
  completedAngles?: number[];
  onPhotoCaptured: (result: CompressResult, angleId: number) => void;
  className?: string;
}

const GUIDANCE_MAP: Record<GuidanceInstruction, { message: string; icon: GuidanceIcon }> = {
  LEVEL_DEVICE: { message: 'Level Phone (Tilt)', icon: 'level' },
  STEP_BACK: { message: 'Step Back Slightly', icon: 'zoom-out' },
  MOVE_CLOSER: { message: 'Move Closer to Car', icon: 'zoom-in' },
  STEP_RIGHT: { message: 'Step Slightly Right', icon: 'right' },
  STEP_LEFT: { message: 'Step Slightly Left', icon: 'left' },
  ALIGNED: { message: 'Green Lock // Auto-Shutter Active', icon: 'check' },
};

export function SmartCameraView({
  currentAngleId,
  totalAngles = 8,
  completedAngles = [],
  onPhotoCaptured,
  className,
}: SmartCameraViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { videoRef, isReady, permissionDenied, errorMessage: _errorMessage, startCamera } = useCameraStream();

  const [isCapturing, setIsCapturing] = React.useState(false);
  const [lumaWarning, setLumaWarning] = React.useState(false);
  const [flash, setFlash] = React.useState(false);
  const [mutedState, setMutedState] = React.useState(() => isMuted());
  const [reticleBox, setReticleBox] = React.useState<ReticleBox>({ left: 0, top: 0, width: 0, height: 0 });

  const prevAlignedRef = React.useRef(false);

  // GuideState ref for 60fps CarGuide3D rendering without React re-render churn
  const guideStateRef = React.useRef<GuideState>({
    target: (currentAngleId - 1) * 45,
    phase: 'seeking',
    user: null,
    captured: completedAngles.map((a) => (a - 1) * 45),
    lockProgress: 0,
    stepKey: currentAngleId,
    firstStep: currentAngleId === 1,
    reducedMotion: false,
  });

  // Calculate high precision reticle container box
  React.useEffect(() => {
    const updateBox = () => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      const rw = Math.min(cw * 0.88, 720);
      const rh = Math.min(ch * 0.58, 440);
      setReticleBox({
        left: (cw - rw) / 2,
        top: (ch - rh) / 2 - 18,
        width: rw,
        height: rh,
      });
    };

    updateBox();
    window.addEventListener('resize', updateBox);
    return () => window.removeEventListener('resize', updateBox);
  }, []);

  const handleCapture = React.useCallback(async () => {
    if (!videoRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      // Play procedural shutter audio and haptics
      playShutter();
      vibrate([30, 45, 30]);

      // Trigger white flash animation
      setFlash(true);
      setTimeout(() => setFlash(false), 240);

      // Update 3D guide state to captured
      guideStateRef.current.phase = 'captured';

      // Analyze brightness
      const lumaResult = analyzeFrameLuma(videoRef.current);
      setLumaWarning(lumaResult.isTooDark);

      // Compress to WebP < 400KB
      const compressed = await compressFrameToWebP(videoRef.current, 2048, 0.82);
      onPhotoCaptured(compressed, currentAngleId);
    } catch (err) {
      console.error('Photo capture error:', err);
      playError();
    } finally {
      setIsCapturing(false);
    }
  }, [currentAngleId, isCapturing, onPhotoCaptured, videoRef]);

  const { guidance, isAligned, requestPermission } = useDeviceSensors(handleCapture);

  // Sync guideStateRef with active sensor and angle state
  React.useEffect(() => {
    guideStateRef.current = {
      target: (currentAngleId - 1) * 45,
      phase: isAligned ? 'locked' : isCapturing ? 'captured' : 'seeking',
      user: null,
      captured: completedAngles.map((a) => (a - 1) * 45),
      lockProgress: isAligned ? 1.0 : 0.0,
      stepKey: currentAngleId,
      firstStep: currentAngleId === 1,
      reducedMotion: false,
    };
  }, [currentAngleId, isAligned, isCapturing, completedAngles]);

  // Audio & haptic cue on Green Lock transition
  React.useEffect(() => {
    if (isAligned && !prevAlignedRef.current) {
      playLock();
      vibrate(22);
    }
    prevAlignedRef.current = isAligned;
  }, [isAligned]);

  React.useEffect(() => {
    startCamera();
  }, [startCamera]);

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mb-4 shadow-lg">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2">Camera Permission Required</h3>
        <p className="text-sm text-[#94A3B8] max-w-sm mb-6 leading-relaxed">
          CarVision requires camera access to guide workshop technicians with 3D chassis alignment.
        </p>
        <Button onClick={() => startCamera()} variant="primary" size="lg" className="shadow-glow">
          <RefreshCw className="w-4 h-4 me-2" />
          <span>Grant Camera Access</span>
        </Button>
      </div>
    );
  }

  const activeGuidance = GUIDANCE_MAP[guidance] || GUIDANCE_MAP.LEVEL_DEVICE;

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden bg-black flex flex-col select-none', className)}
    >
      {/* 1. Video Viewport Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* 2. Reticle with Letterbox Cutout and 4 L-shaped Corner Brackets */}
      {reticleBox.width > 0 && (
        <Reticle
          box={reticleBox}
          ready={isAligned}
          breathing={!isAligned}
        />
      )}

      {/* 3. Top HUD: Guidance Banner & 8-Step Angle Progress */}
      <div
        className="pointer-events-none absolute top-4 inset-x-0 z-20 flex flex-col items-center gap-2 px-4"
        style={{ maxWidth: 'min(480px, calc(100vw - 32px))', marginInline: 'auto' }}
      >
        <GuidanceBanner
          message={activeGuidance.message}
          icon={activeGuidance.icon}
          ready={isAligned}
        />

        {/* 8-Segment Step Progress Pills */}
        <div className="flex items-center gap-1.5 mt-1" aria-hidden="true">
          {Array.from({ length: totalAngles }).map((_, i) => {
            const angleId = i + 1;
            const isDone = completedAngles.includes(angleId);
            const isActive = angleId === currentAngleId;
            return (
              <span
                key={angleId}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 26 : 14,
                  backgroundColor: isDone ? '#00E599' : isActive ? '#19D3FF' : 'rgba(255, 255, 255, 0.28)',
                  boxShadow: isActive ? '0 0 10px rgba(25, 211, 255, 0.7)' : isDone ? '0 0 8px rgba(0, 229, 153, 0.5)' : undefined,
                }}
              />
            );
          })}
        </div>

        {lumaWarning && (
          <div className="px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs flex items-center gap-1.5 font-medium shadow-md mt-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Bay Lighting</span>
          </div>
        )}
      </div>

      {/* 4. Top-End Controls: Audio Mute Toggle & Angle Status */}
      <div className="absolute top-4 end-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !mutedState;
            setMuted(next);
            setMutedState(next);
            unlockAudio();
          }}
          aria-label={mutedState ? 'Unmute Audio' : 'Mute Audio'}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-md border border-white/15 active:bg-black/80 transition-colors shadow-lg cursor-pointer"
        >
          <CIcon name={mutedState ? 'volume-off' : 'volume'} size={18} />
        </button>

        <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/15 shadow-lg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#19D3FF] animate-pulse" />
          <span>{currentAngleId}/{totalAngles}</span>
        </div>
      </div>

      {/* 5. Bottom-Start: Floating 3D Sedan HUD (CarGuide3D) */}
      <div
        className="pointer-events-none absolute z-20 transition-opacity duration-200"
        style={{
          insetInlineStart: 'max(16px, env(safe-area-inset-left))',
          bottom: 'max(88px, calc(env(safe-area-inset-bottom) + 80px))',
          width: 'clamp(120px, 20vw, 160px)',
        }}
      >
        <div className="rounded-2xl border border-white/15 bg-black/55 p-1.5 backdrop-blur-md shadow-2xl">
          <div className="w-full aspect-[3/2] overflow-hidden rounded-xl">
            <CarGuide3D stateRef={guideStateRef} />
          </div>
        </div>
      </div>

      {/* 6. Bottom Controls: Shutter Button and Sensor Calibration */}
      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center justify-center z-20 pointer-events-auto">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!isReady || isCapturing}
          aria-label="Capture Photo"
          className={cn(
            'group relative flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer',
            isAligned
              ? 'border-[#00E599] bg-[#00E599]/25 shadow-[0_0_35px_rgba(0,229,153,0.7)] scale-105'
              : 'border-white/80 bg-black/40 backdrop-blur-md hover:border-white'
          )}
        >
          <span
            className="rounded-full transition-all duration-200 shadow-md"
            style={{
              width: isAligned ? 54 : 48,
              height: isAligned ? 54 : 48,
              backgroundColor: isAligned ? '#00E599' : '#ffffff',
              boxShadow: isAligned ? '0 0 20px #00E599' : undefined,
            }}
          />
        </button>

        {/* Gyro Sensor Permission Button (iOS WebKit trigger) */}
        <button
          type="button"
          onClick={() => requestPermission()}
          className="mt-3 text-xs text-[#94A3B8] hover:text-[#19D3FF] underline transition-colors cursor-pointer"
        >
          Calibrate Motion Sensors
        </button>
      </div>

      {/* 7. Camera Flash Animation Overlay */}
      {flash && <div className="cv-flash pointer-events-none absolute inset-0 bg-white z-50" />}
    </div>
  );
}
