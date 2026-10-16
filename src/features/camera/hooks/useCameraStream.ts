'use client';

import * as React from 'react';

export interface UseCameraStreamResult {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  permissionDenied: boolean;
  errorMessage: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCameraStream(): UseCameraStreamResult {
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [permissionDenied, setPermissionDenied] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const stopCamera = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsReady(false);
    }
  }, [stream]);

  const startCamera = React.useCallback(async () => {
    setPermissionDenied(false);
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setIsReady(true);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      }
      setErrorMessage(error.message || 'Failed to initialize camera');
      setIsReady(false);
    }
  }, []);

  // Handle visibility change (reconnect if iOS Safari froze track on background)
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && stream) {
        const track = stream.getVideoTracks()[0];
        if (!track || track.readyState === 'ended' || track.muted) {
          startCamera();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stream, startCamera]);

  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    videoRef,
    isReady,
    permissionDenied,
    errorMessage,
    startCamera,
    stopCamera,
  };
}
