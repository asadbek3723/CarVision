'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Download, Film, Loader2, RefreshCw, Share2, Sparkles, X } from 'lucide-react';
import type { VeloceProduct } from '@/domain/veloce-catalog';
import { useAuth } from '@/features/auth/context/AuthContext';
import { createReelAudio } from '@/features/video/engine/reel-audio';
import { createReelRenderer, type ReelAngle } from '@/features/video/engine/reel-renderer';
import { REEL_DURATION, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from '@/features/video/engine/reel-timeline';

/** One finished (tuned) side of the car. The stock photo is never part of the reel. */
export interface CinematicAngleFrame {
  id: string;
  label: string;
  afterUrl: string;
}

interface CinematicVideoStudioProps {
  isOpen: boolean;
  onClose: () => void;
  angles: CinematicAngleFrame[];
  selectedParts: VeloceProduct[];
  carName?: string;
}

type Phase = 'idle' | 'mastering' | 'loading' | 'recording' | 'done' | 'error';
type FrameState = 'waiting' | 'working' | 'done';

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

const MAX_FRAMES = 5;
const MASTER_TIMEOUT_MS = 70_000;

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

/** Mastered frames survive closing and reopening the studio during this visit (no second AI call). */
const masteredCache = new Map<string, string>();

function cacheKey(src: string): string {
  // FNV-1a over a sample of the string: data URLs are megabytes long
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(src.length / 4096));
  for (let i = 0; i < src.length; i += step) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${src.length}:${(h >>> 0).toString(36)}`;
}

/** Same-origin data URI of the photo (the API only accepts data URIs or allow-listed hosts). */
async function toSendable(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
  try {
    const img = await loadImage(src);
    if (!img) return src;
    const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * ratio);
    c.height = Math.round(img.naturalHeight * ratio);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.92);
  } catch {
    return src;
  }
}

/** Asks the AI to re-master one frame; resolves to the original when that is not possible. */
async function masterFrame(src: string, angleId: string, partNames: string[], signal: AbortSignal): Promise<string> {
  const key = cacheKey(src);
  const hit = masteredCache.get(key);
  if (hit) return hit;
  try {
    const image = await toSendable(src);
    const timeout = AbortSignal.timeout(MASTER_TIMEOUT_MS);
    const res = await fetch('/api/v1/video/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, angleId, partNames }),
      signal: typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal,
    });
    const data = (await res.json().catch(() => null)) as { enhanced?: boolean; image?: string | null } | null;
    if (res.ok && data?.enhanced && typeof data.image === 'string' && data.image.startsWith('data:image/')) {
      // Never accept a broken frame: it must decode
      const ok = await loadImage(data.image);
      if (ok) {
        masteredCache.set(key, data.image);
        return data.image;
      }
    }
  } catch {
    // offline, aborted or provider failure: the built-in grade still makes it look good
  }
  return src;
}

/** Canvas font names of the page's Montserrat / Outfit (next/font hashes the family names). */
async function resolveFonts(): Promise<{ display?: string; bold?: string }> {
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue('--nf-montserrat').trim() || undefined;
  const bold = css.getPropertyValue('--nf-outfit').trim() || undefined;
  try {
    const loads: Promise<unknown>[] = [];
    if (display) for (const w of [200, 300, 400, 500]) loads.push(document.fonts.load(`${w} 40px ${display}`));
    if (bold) loads.push(document.fonts.load(`700 40px ${bold}`));
    await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    // system fonts
  }
  return { ...(display ? { display } : {}), ...(bold ? { bold } : {}) };
}

class RecordingAborted extends Error {}

export function CinematicVideoStudio({
  isOpen,
  onClose,
  angles,
  selectedParts,
  carName = 'CarVision Tuning',
}: CinematicVideoStudioProps) {
  const t = useTranslations('video');
  const { user } = useAuth();
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [progress, setProgress] = React.useState(0);
  const [errorKey, setErrorKey] = React.useState<'' | 'errUnsupported' | 'errImages' | 'errFailed' | 'errStopped' | 'errRetry'>('');
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [fileExt, setFileExt] = React.useState<'mp4' | 'webm'>('mp4');
  const [attempt, setAttempt] = React.useState(0);
  const [frames, setFrames] = React.useState<{ id: string; src: string; state: FrameState }[]>([]);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const blobRef = React.useRef<Blob | null>(null);
  const phaseRef = React.useRef<Phase>('idle');
  phaseRef.current = phase;

  // Everything happens automatically the moment the modal opens: AI masters every tuned
  // frame, then one fixed edit and one fixed score are recorded. No choices to make.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let rafId = 0;
    let timerId = 0;
    let scheduled = 0;
    let recorder: MediaRecorder | null = null;
    const controller = new AbortController();
    const source = angles.filter((a) => Boolean(a.afterUrl)).slice(0, MAX_FRAMES);
    // Created right away, close to the user's tap, so Safari lets it play
    let audio: ReturnType<typeof createReelAudio> = source.length > 0 ? createReelAudio(source.length) : null;
    const abortIfHidden = () => {
      if (document.hidden && phaseRef.current === 'recording') cancelled = true;
    };
    document.addEventListener('visibilitychange', abortIfHidden);

    const run = async () => {
      setProgress(0);
      setErrorKey('');
      setVideoUrl(null);
      blobRef.current = null;

      if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
        setErrorKey('errUnsupported');
        setPhase('error');
        return;
      }
      if (source.length === 0) {
        setErrorKey('errImages');
        setPhase('error');
        return;
      }

      // 1. AI mastering, two frames at a time
      setPhase('mastering');
      setFrames(source.map((a) => ({ id: a.id, src: a.afterUrl, state: 'waiting' })));
      const partNames = selectedParts.map((p) => p.name).filter(Boolean).slice(0, 6);
      const mastered: string[] = source.map((a) => a.afterUrl);
      let next = 0;
      const worker = async () => {
        while (!cancelled && next < source.length) {
          const i = next++;
          const a = source[i]!;
          setFrames((f) => f.map((x, k) => (k === i ? { ...x, state: 'working' } : x)));
          mastered[i] = await masterFrame(a.afterUrl, a.id, partNames, controller.signal);
          setFrames((f) => f.map((x, k) => (k === i ? { ...x, src: mastered[i]!, state: 'done' } : x)));
        }
      };
      await Promise.all([worker(), worker()]);
      if (cancelled) return;

      // 2. Decode frames + fonts
      setPhase('loading');
      const [images, fonts] = await Promise.all([Promise.all(mastered.map((src, i) => loadImage(src).then((img) => img ?? loadImage(source[i]!.afterUrl)))), resolveFonts()]);
      if (cancelled) return;
      const firstOk = images.find(Boolean);
      if (!firstOk) {
        setErrorKey('errImages');
        setPhase('error');
        return;
      }
      // Keep the photo count the score was built for: a frame that failed reuses the hero
      const loaded: ReelAngle[] = source.map((a, i) => ({ id: a.id, label: a.label, image: images[i] ?? firstOk }));

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: false });
      if (!canvas || !ctx) {
        setErrorKey('errFailed');
        setPhase('error');
        return;
      }
      canvas.width = REEL_WIDTH;
      canvas.height = REEL_HEIGHT;

      const renderer = createReelRenderer({
        angles: loaded,
        parts: selectedParts.map((p) => ({ name: p.name, category: p.categoryLabel || p.category, brand: p.brand })),
        carName,
        brandName: user?.shop?.shop_name,
        madeByLabel: t('madeBy'),
        fonts,
      });

      if (!audio) audio = createReelAudio(loaded.length);
      const stream = canvas.captureStream(REEL_FPS);
      audio?.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

      const mimeType = pickMime();
      const chunks: Blob[] = [];
      try {
        recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: 16_000_000,
          audioBitsPerSecond: 256_000,
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

      // 3. Real-time render, locked to the audio clock
      await new Promise<void>((resolve, reject) => {
        // rAF keeps frames in step with the display; the timer is a safety net for
        // browsers/panes that throttle rAF. Whichever fires first runs the frame.
        const schedule = () => {
          const id = ++scheduled;
          const go = () => {
            if (id === scheduled) tick();
          };
          rafId = requestAnimationFrame(go);
          timerId = window.setTimeout(go, 40);
        };
        const tick = () => {
          if (cancelled) {
            reject(new RecordingAborted());
            return;
          }
          const wall = (performance.now() - startedAt) / 1000 - 0.12;
          const now = audio && audio.isRunning() && audio.currentTime() > 0 ? audio.currentTime() : Math.max(0, wall);
          renderer.draw(ctx, now);
          setProgress(Math.min(1, now / REEL_DURATION));
          if (now >= REEL_DURATION) {
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
      if (cancelled && !(err instanceof RecordingAborted)) return;
      if (err instanceof RecordingAborted) {
        setErrorKey('errStopped');
      } else {
        console.error('Reel render failed:', err);
        setErrorKey('errRetry');
      }
      setPhase('error');
    });

    return () => {
      cancelled = true;
      controller.abort();
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

  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && phase === 'done';
  const masteredCount = frames.filter((f) => f.state === 'done').length;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('dialog')}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
    >
      <div className="relative flex max-h-[96vh] w-full max-w-[440px] flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-[#0B0D13] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 self-start ps-1 text-sm font-bold tracking-wide text-white">
          <Film className="h-4 w-4 text-[#D4AE62]" />
          <span>{t('title')}</span>
        </div>

        <div className="relative aspect-[9/16] w-full max-h-[68vh] overflow-hidden rounded-2xl bg-black">
          <canvas
            ref={canvasRef}
            className={`h-full w-full object-contain ${phase === 'loading' || phase === 'recording' ? 'block' : 'hidden'}`}
          />
          {phase === 'done' && videoUrl && (
            <video src={videoUrl} className="h-full w-full object-contain" controls autoPlay loop playsInline />
          )}

          {(phase === 'mastering' || phase === 'idle') && (
            <div className="absolute inset-0 flex flex-col">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_40%,rgba(212,174,98,0.14),transparent_70%)]" />
              <div className="relative grid min-h-0 flex-1 grid-cols-2 content-center gap-2 overflow-hidden p-4">
                {frames.map((f, i) => (
                  <div
                    key={f.id}
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-white/[0.04] ${frames.length % 2 === 1 && i === 0 ? 'col-span-2 aspect-[16/9]' : ''}`}
                  >
                    <img
                      src={f.src}
                      alt=""
                      className={`h-full w-full object-cover transition duration-700 ${f.state === 'done' ? 'opacity-100 saturate-100' : 'opacity-45 saturate-50'}`}
                    />
                    {f.state === 'working' && (
                      <div aria-hidden className="absolute inset-x-0 h-10 animate-[scan_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-[#D4AE62]/40 to-transparent" />
                    )}
                    {f.state === 'done' && (
                      <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#D4AE62] text-black shadow-lg">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="relative shrink-0 px-5 pb-6 text-center" aria-live="polite">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4AE62]">
                  <Sparkles className="h-3.5 w-3.5" /> AI
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {t('mastering', { done: masteredCount, total: Math.max(1, frames.length) })}
                </p>
                <p className="mt-1 text-xs text-white/50">{t('masteringHint')}</p>
                <div className="mx-auto mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gold-gradient transition-[width] duration-500"
                    style={{ width: `${Math.round((masteredCount / Math.max(1, frames.length)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AE62]" />
              <p className="text-sm text-white/80">{t('preparing')}</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm text-red-200" role="alert">
                {errorKey ? t(errorKey) : ''}
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
              {t('recording', { seconds: Math.ceil((1 - progress) * REEL_DURATION) })}
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
                {t('share')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
