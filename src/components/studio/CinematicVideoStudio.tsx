'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, Film, Loader2, RefreshCw, Share2, X } from 'lucide-react';
import type { VeloceProduct } from '@/domain/veloce-catalog';
import { useAuth } from '@/features/auth/context/AuthContext';
import { createReelAudio } from '@/features/video/engine/reel-audio';
import { createReelRenderer, type ReelAngle } from '@/features/video/engine/reel-renderer';
import { REEL_DURATION, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from '@/features/video/engine/reel-timeline';

export interface CinematicAngleFrame {
  id: string;
  label: string;
  beforeUrl: string;
  afterUrl: string;
}

interface CinematicVideoStudioProps {
  isOpen: boolean;
  onClose: () => void;
  angles: CinematicAngleFrame[];
  selectedParts: VeloceProduct[];
  carName?: string;
}

type Phase = 'idle' | 'loading' | 'recording' | 'done' | 'error';

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

class RecordingAborted extends Error {}

export function CinematicVideoStudio({
  isOpen,
  onClose,
  angles,
  selectedParts,
  carName = 'CarVision Tuning',
}: CinematicVideoStudioProps) {
  const { user } = useAuth();
  const t = useTranslations('flow');
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [progress, setProgress] = React.useState(0);
  const [errorText, setErrorText] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [fileExt, setFileExt] = React.useState<'mp4' | 'webm'>('mp4');
  const [attempt, setAttempt] = React.useState(0);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const blobRef = React.useRef<Blob | null>(null);

  // The whole reel is produced automatically the moment the modal opens: one fixed
  // script, one fixed score, no choices. 100% client side, so it costs nothing.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let rafId = 0;
    let timerId = 0;
    let scheduled = 0;
    let recorder: MediaRecorder | null = null;
    let audio: ReturnType<typeof createReelAudio> = null;
    const abortIfHidden = () => {
      if (document.hidden) cancelled = true;
    };
    document.addEventListener('visibilitychange', abortIfHidden);

    const run = async () => {
      setPhase('loading');
      setProgress(0);
      setErrorText('');
      setVideoUrl(null);
      blobRef.current = null;

      if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
        setErrorText(t('vsNoSupport'));
        setPhase('error');
        return;
      }

      // 1. Load every angle (a failed image falls back to its pair)
      const loaded: ReelAngle[] = [];
      for (const a of angles.slice(0, 5)) {
        const [before, after] = await Promise.all([loadImage(a.beforeUrl), loadImage(a.afterUrl)]);
        const b = before ?? after;
        const f = after ?? before;
        if (b && f) loaded.push({ id: a.id, label: a.label, before: b, after: f });
      }
      if (cancelled) return;
      if (loaded.length === 0) {
        setErrorText(t('vsNoImages'));
        setPhase('error');
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: false });
      if (!canvas || !ctx) {
        setErrorText(t('vsFail'));
        setPhase('error');
        return;
      }
      canvas.width = REEL_WIDTH;
      canvas.height = REEL_HEIGHT;

      const renderer = createReelRenderer({
        angles: loaded,
        parts: selectedParts.map((p) => ({ name: p.name, category: p.category, brand: p.brand })),
        carName,
        brandName: user?.shop?.shop_name,
      });

      audio = createReelAudio(loaded.length);
      const stream = canvas.captureStream(REEL_FPS);
      audio?.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

      const mimeType = pickMime();
      const chunks: Blob[] = [];
      try {
        recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: 14_000_000,
          audioBitsPerSecond: 192_000,
        });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder!.onstop = () => resolve();
      });

      renderer.draw(ctx, 0);
      setPhase('recording');
      recorder.start(250);
      audio?.start();
      const startedAt = performance.now();

      // 2. Real-time render, locked to the audio clock
      await new Promise<void>((resolve, reject) => {
        // rAF keeps frames in step with the display; the timer is a safety net for
        // browsers/panes that throttle rAF. Whichever fires first runs the frame.
        const schedule = () => {
          const id = ++scheduled;
          const run = () => {
            if (id === scheduled) tick();
          };
          rafId = requestAnimationFrame(run);
          timerId = window.setTimeout(run, 40);
        };
        const tick = () => {
          if (cancelled) {
            reject(new RecordingAborted());
            return;
          }
          const wall = (performance.now() - startedAt) / 1000 - 0.12;
          const t = audio && audio.isRunning() && audio.currentTime() > 0 ? audio.currentTime() : Math.max(0, wall);
          renderer.draw(ctx, t);
          setProgress(Math.min(1, t / REEL_DURATION));
          if (t >= REEL_DURATION) {
            resolve();
            return;
          }
          schedule();
        };
        schedule();
      });

      await new Promise((r) => setTimeout(r, 250));
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      audio?.close();
      audio = null;

      const type = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      blobRef.current = blob;
      setFileExt(type.includes('mp4') ? 'mp4' : 'webm');
      setVideoUrl(URL.createObjectURL(blob));
      setPhase('done');
    };

    run().catch((err: unknown) => {
      if (err instanceof RecordingAborted) {
        setErrorText(t('vsStopped'));
      } else {
        console.error('Reel render failed:', err);
        setErrorText(t('vsFail'));
      }
      setPhase('error');
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', abortIfHidden);
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch {
        // already stopped
      }
      audio?.close();
    };
    // angles/parts are stable snapshots for the lifetime of the modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, attempt]);

  React.useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const fileName = `carvision-tuning.${fileExt}`;

  const handleShare = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], fileName, { type: blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'CarVision Tuning' });
      }
    } catch {
      // share cancelled
    }
  };

  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && phase === 'done';

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tuning video"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
    >
      <div className="relative flex max-h-[96vh] w-full max-w-[440px] flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-[#0B0D13] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 self-start ps-1 text-sm font-bold tracking-wide text-white">
          <Film className="h-4 w-4 text-[#D4AE62]" />
          <span>Tuning videosi</span>
        </div>

        <div className="relative aspect-[9/16] w-full max-h-[68vh] overflow-hidden rounded-2xl bg-black">
          <canvas
            ref={canvasRef}
            className={`h-full w-full object-contain ${phase === 'loading' || phase === 'recording' ? 'block' : 'hidden'}`}
          />
          {phase === 'done' && videoUrl && (
            <video
              src={videoUrl}
              className="h-full w-full object-contain"
              controls
              autoPlay
              loop
              playsInline
            />
          )}
          {phase === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AE62]" />
              <p className="text-sm text-white/80">{t('vsPreparing')}</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm text-red-200" role="alert">
                {errorText}
              </p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4AE62] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
              >
                <RefreshCw className="h-4 w-4" />
                {t('retry')}
              </button>
            </div>
          )}
        </div>

        {phase === 'recording' && (
          <div className="w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#D4AE62] transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-center text-xs text-[#A69F92]">
              Video yaratilmoqda… {Math.ceil((1 - progress) * REEL_DURATION)} soniya. Oynani yopmang.
            </p>
          </div>
        )}

        {phase === 'done' && videoUrl && (
          <div className="flex w-full gap-3">
            <a
              href={videoUrl}
              download={fileName}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#D4AE62] px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              {t('download')}
            </a>
            {canShare && (
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Share2 className="h-4 w-4" />
                Ulashish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
