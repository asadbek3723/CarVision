'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';

interface Props {
  /** A captured frame as a JPEG data URL (max 1600px on the long edge). */
  onShot: (dataUrl: string) => void;
  /** A file picked from the device. */
  onFile: (file: File) => void;
  busy?: boolean;
}

const MAX_EDGE = 1600;

/**
 * Full-screen live camera with a big shutter and "upload from device" at the bottom.
 * Falls back gracefully to upload-only when the camera is unavailable or denied.
 */
export function LiveCamera({ onShot, onFile, busy }: Props) {
  const t = useTranslations('photoModal');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<'none' | 'denied' | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('none');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setReady(true);
        }
      } catch {
        if (!cancelled) setError('denied');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [t]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
    onShot(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#D4AE62]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="text-sm text-white/75">{error === 'none' ? t('camNone') : t('camDenied')}</p>
          </div>
        )}
        {ready && (
          <div className="pointer-events-none absolute inset-6 rounded-3xl border border-white/25">
            <span className="absolute -top-px start-8 h-px w-16 bg-[#D4AE62]" />
            <span className="absolute -bottom-px end-8 h-px w-16 bg-[#D4AE62]" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/20">
          <ImagePlus className="h-4 w-4" />
          {t('deviceTitle')}
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={!ready || busy}
          aria-label={t('shoot')}
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80 bg-white/15 transition active:scale-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-7 w-7 text-white" />}
        </button>
        <span className="w-[148px]" />
      </div>
    </div>
  );
}
