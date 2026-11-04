'use client';

import * as React from 'react';
import { computeLevel, isLevel, type DeviceLevel } from '../lib/device-level';

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export interface UseDeviceLevel {
  /** Smoothed phone attitude, or null while no sensor data is available (desktop, denied, not asked yet). */
  level: DeviceLevel | null;
  /** True when the phone is level enough to shoot. Always false without sensor data. */
  aligned: boolean;
  /** iOS only: motion access must be requested from a tap. */
  needsPermission: boolean;
  requestPermission: () => Promise<void>;
}

const SMOOTHING = 0.25;

function screenAngle(): number {
  if (typeof window === 'undefined') return 0;
  return window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
}

/** Live "is the phone level" signal for the Smart Camera guide. Degrades silently without sensors. */
export function useDeviceLevel(enabled = true): UseDeviceLevel {
  const [level, setLevel] = React.useState<DeviceLevel | null>(null);
  const [needsPermission, setNeedsPermission] = React.useState(false);
  const [granted, setGranted] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const ctor = window.DeviceOrientationEvent as OrientationCtor;
    if (typeof ctor.requestPermission === 'function') setNeedsPermission(true);
    else setGranted(true);
  }, []);

  const requestPermission = React.useCallback(async () => {
    const ctor = (typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined) as OrientationCtor | undefined;
    try {
      const res = await ctor?.requestPermission?.();
      if (res === 'granted') {
        setGranted(true);
        setNeedsPermission(false);
      }
    } catch {
      /* The guide simply stays off. */
    }
  }, []);

  React.useEffect(() => {
    if (!enabled || !granted) return;
    let smooth: DeviceLevel | null = null;
    let frame = 0;
    let latest: DeviceLevel | null = null;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
      latest = computeLevel(e.beta, e.gamma, screenAngle());
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!latest) return;
        smooth = smooth
          ? {
              roll: smooth.roll + (latest.roll - smooth.roll) * SMOOTHING,
              pitch: smooth.pitch + (latest.pitch - smooth.pitch) * SMOOTHING,
            }
          : latest;
        const next = { roll: Math.round(smooth.roll * 2) / 2, pitch: Math.round(smooth.pitch * 2) / 2 };
        setLevel((prev) => (prev && prev.roll === next.roll && prev.pitch === next.pitch ? prev : next));
      });
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, granted]);

  return { level, aligned: level ? isLevel(level) : false, needsPermission, requestPermission };
}
