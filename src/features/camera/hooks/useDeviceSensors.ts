'use client';

import * as React from 'react';

export type GuidanceInstruction = 'LEVEL_DEVICE' | 'STEP_BACK' | 'MOVE_CLOSER' | 'STEP_RIGHT' | 'STEP_LEFT' | 'ALIGNED';

export interface UseDeviceSensorsResult {
  isSupported: boolean;
  isPermissionGranted: boolean;
  rollDelta: number;
  pitchDelta: number;
  guidance: GuidanceInstruction;
  isAligned: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useDeviceSensors(onGreenLockTrigger?: () => void): UseDeviceSensorsResult {
  const [isSupported, setIsSupported] = React.useState(true);
  const [isPermissionGranted, setIsPermissionGranted] = React.useState(false);
  const [rollDelta, setRollDelta] = React.useState(0);
  const [pitchDelta, setPitchDelta] = React.useState(0);
  const [guidance, setGuidance] = React.useState<GuidanceInstruction>('LEVEL_DEVICE');
  const [isAligned, setIsAligned] = React.useState(false);

  const lockTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const requestPermission = React.useCallback(async () => {
    try {
      // iOS 13+ permission request
      const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof DeviceOrientation?.requestPermission === 'function') {
        const response = await DeviceOrientation.requestPermission();
        const granted = response === 'granted';
        setIsPermissionGranted(granted);
        return granted;
      }

      // Android and standard desktop browsers do not require explicit permission
      setIsPermissionGranted(true);
      return true;
    } catch {
      setIsSupported(false);
      return false;
    }
  }, []);

  React.useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 90; // Roll (-90 to 90)
      const beta = e.beta ?? 0; // Pitch (-180 to 180)

      // Ideal phone orientation: vertical portrait held at chest height (~85° to 90° gamma, 0° to 10° beta)
      const roll = Math.abs(gamma);
      const pitch = Math.abs(beta);

      const rollError = Math.abs(roll - 90);
      const pitchError = Math.abs(pitch - 10);

      setRollDelta(rollError);
      setPitchDelta(pitchError);

      const withinTolerance = rollError < 3.5 && pitchError < 4.0;
      setIsAligned(withinTolerance);

      if (withinTolerance) {
        setGuidance('ALIGNED');
        if (!lockTimerRef.current) {
          lockTimerRef.current = setTimeout(() => {
            onGreenLockTrigger?.();
            if (navigator.vibrate) {
              navigator.vibrate([25, 45, 25]);
            }
          }, 400); // Green lock triggers after 400ms steady alignment
        }
      } else {
        if (lockTimerRef.current) {
          clearTimeout(lockTimerRef.current);
          lockTimerRef.current = null;
        }

        if (rollError >= 4.0) {
          setGuidance('LEVEL_DEVICE');
        } else if (pitchError >= 5.0) {
          setGuidance('MOVE_CLOSER');
        } else {
          setGuidance('LEVEL_DEVICE');
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
    };
  }, [onGreenLockTrigger]);

  return {
    isSupported,
    isPermissionGranted,
    rollDelta,
    pitchDelta,
    guidance,
    isAligned,
    requestPermission,
  };
}
