'use client';

import * as React from 'react';
import { useCameraStream } from '../hooks/useCameraStream';
import { useDeviceSensors, type GuidanceInstruction } from '../hooks/useDeviceSensors';
import { Camera3DOverlay } from './Camera3DOverlay';
import { compressFrameToWebP, type CompressResult } from '../lib/image-compressor';
import { analyzeFrameLuma } from '../lib/luma-analyzer';
import { Button } from '@/components/ui/Button';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartCameraViewProps {
  currentAngleId: number;
  totalAngles?: number;
  onPhotoCaptured: (result: CompressResult, angleId: number) => void;
  className?: string;
}

const GUIDANCE_LABELS: Record<GuidanceInstruction, string> = {
  LEVEL_DEVICE: 'Level your phone',
  STEP_BACK: 'Step back slightly',
  MOVE_CLOSER: 'Move closer to car',
  STEP_RIGHT: 'Step slightly right',
  STEP_LEFT: 'Step slightly left',
  ALIGNED: 'Locked & Aligned',
};

export function SmartCameraView({
  currentAngleId,
  totalAngles = 8,
  onPhotoCaptured,
  className
}: SmartCameraViewProps) {
  const { videoRef, isReady, permissionDenied, errorMessage: _errorMessage, startCamera } = useCameraStream();
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [lumaWarning, setLumaWarning] = React.useState(false);

  const handleCapture = React.useCallback(async () => {
    if (!videoRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      // Analyze brightness
      const lumaResult = analyzeFrameLuma(videoRef.current);
      setLumaWarning(lumaResult.isTooDark);

      // Compress to WebP < 400KB
      const compressed = await compressFrameToWebP(videoRef.current, 2048, 0.82);
      onPhotoCaptured(compressed, currentAngleId);
    } catch (err) {
      console.error('Photo capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [currentAngleId, isCapturing, onPhotoCaptured, videoRef]);

  const { guidance, isAligned, requestPermission } = useDeviceSensors(handleCapture);

  React.useEffect(() => {
    startCamera();
  }, [startCamera]);

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2">Camera Access Required</h3>
        <p className="text-sm text-[#94A3B8] max-w-sm mb-6">
          CarVision needs camera permission to align vehicle angles and render custom parts.
        </p>
        <Button onClick={() => startCamera()} variant="primary">
          <RefreshCw className="w-4 h-4 me-2" /> Allow Camera Access
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-black flex flex-col', className)}>
      {/* Video Viewport */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* 3D Wireframe Alignment Overlay */}
      {isReady && <Camera3DOverlay angleId={currentAngleId} isAligned={isAligned} />}

      {/* Top HUD: Angle Status & Lighting Warning */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="px-4 py-2 rounded-full glass-panel text-xs font-semibold text-white">
          Angle {currentAngleId} of {totalAngles}
        </div>

        {lumaWarning && (
          <div className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Low Lighting
          </div>
        )}
      </div>

      {/* Guidance Instruction Pill */}
      <div className="absolute top-16 inset-x-0 flex justify-center z-20 pointer-events-none">
        <div
          className={cn(
            'px-5 py-2 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg transition-all duration-300 flex items-center gap-2',
            isAligned
              ? 'bg-[#00E599] text-[#0A0B0F] shadow-[0_0_20px_rgba(0,229,153,0.5)] scale-105'
              : 'bg-[#12141A]/90 text-white border border-[#232733]'
          )}
        >
          {isAligned && <CheckCircle2 className="w-4 h-4" />}
          <span>{GUIDANCE_LABELS[guidance]}</span>
        </div>
      </div>

      {/* Bottom Shutter Controls */}
      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center justify-center z-20">
        <button
          onClick={handleCapture}
          disabled={!isReady || isCapturing}
          className={cn(
            'w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50',
            isAligned
              ? 'border-[#00E599] bg-[#00E599]/20 shadow-[0_0_30px_rgba(0,229,153,0.6)]'
              : 'border-white/80 bg-white/10 hover:bg-white/20'
          )}
          aria-label="Capture photo"
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full transition-colors',
              isAligned ? 'bg-[#00E599]' : 'bg-white'
            )}
          />
        </button>

        {/* Gyro Sensor Permission Button (if needed on iOS) */}
        <button
          onClick={() => requestPermission()}
          className="mt-3 text-xs text-[#94A3B8] hover:text-white underline transition-colors"
        >
          Enable Motion Guidance
        </button>
      </div>
    </div>
  );
}
