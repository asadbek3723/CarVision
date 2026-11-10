'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Check, Compass, ImagePlus, Loader2, Sun, X } from 'lucide-react';
import { useDeviceLevel } from '@/features/camera/hooks/useDeviceLevel';
import { LevelGuide } from '@/features/camera/components/LevelGuide';
import {
  SHOT_PLANS,
  SHOT_PROFILES,
  lightHint,
  pitchHint,
  type LightHint,
  type PitchHint,
  type ProductShot,
  type ShotProfile,
} from '../lib/product-shots';

interface Props {
  profile: ShotProfile;
  /** The seller picked another kind of product in the camera. */
  onProfileChange?: ((profile: ShotProfile) => void) | undefined;
  /** A captured frame as a JPEG data URL (max 1600px on the long edge). */
  onShot: (dataUrl: string) => void;
  /** A file picked from the device. */
  onFile: (file: File) => void;
  onClose?: () => void;
  /** Shown when at least one photo was taken; closes the camera. */
  onDone?: () => void;
  busy?: boolean;
}

const MAX_EDGE = 1600;
const SAMPLE_W = 32;
const SAMPLE_H = 24;

function formatDistance([min, max]: readonly [number, number], t: (k: string, v?: Record<string, string>) => string): string {
  if (max >= 150) {
    const m = (v: number) => (Math.round(v / 10) / 10).toString();
    return t('unitM', { value: `${m(min)}–${m(max)}` });
  }
  return t('unitCm', { value: `${min}–${max}` });
}

/** Seen from above: the product in the middle, the phone where it should stand, and how far. */
function OrbitMap({ shot }: { shot: ProductShot }) {
  // The ring shows relative distance: close-ups near the product, wide shots far away.
  const r = shot.frame === 'detail' || shot.frame === 'label' ? 20 : shot.frame === 'wide' ? 38 : 30;
  // "Front" is at the bottom of the map (where the seller stands); bearings go clockwise.
  const x = 50 + Math.sin((shot.bearing * Math.PI) / 180) * r;
  const y = 50 + Math.cos((shot.bearing * Math.PI) / 180) * r;
  const angleToProduct = (Math.atan2(50 - y, 50 - x) * 180) / Math.PI;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeDasharray="2 3" />
      <rect x="40" y="43" width="20" height="14" rx="3" fill="rgba(241,211,150,0.25)" stroke="#E8BF74" strokeWidth="1.5" />
      <line x1="50" y1="57" x2="50" y2="62" stroke="#E8BF74" strokeWidth="1.5" />
      {/* view cone */}
      <g transform={`translate(${x} ${y}) rotate(${angleToProduct})`}>
        <path d="M0 0 L16 -7 L16 7 Z" fill="rgba(110,231,183,0.22)" />
        <rect x="-5" y="-3.5" width="7" height="7" rx="1.5" fill="#6EE7B7" />
      </g>
      <line x1={x} y1={y} x2="50" y2="50" stroke="rgba(110,231,183,0.55)" strokeWidth="1" strokeDasharray="1.5 2" />
    </svg>
  );
}

/** What the product should look like inside the frame for this shot. */
function FrameGuide({ shot, ok }: { shot: ProductShot; ok: boolean }) {
  const stroke = ok ? '#6EE7B7' : '#E8BF74';
  const corner = (x: number, y: number, dx: number, dy: number) => (
    <path d={`M${x} ${y + dy * 10} L${x} ${y} L${x + dx * 10} ${y}`} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
  );
  if (shot.frame === 'detail') {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <circle cx="50" cy="50" r="22" fill="none" stroke={stroke} strokeWidth="1.2" />
        <circle cx="50" cy="50" r="30" fill="none" stroke={stroke} strokeOpacity="0.3" strokeWidth="0.6" strokeDasharray="2 2" />
        <path d="M50 44 V56 M44 50 H56" stroke={stroke} strokeWidth="0.8" />
      </svg>
    );
  }
  if (shot.frame === 'label') {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <rect x="18" y="38" width="64" height="24" rx="3" fill="none" stroke={stroke} strokeWidth="1.2" />
        {[45, 50, 55].map((y) => (
          <line key={y} x1="25" x2={y === 55 ? 58 : 75} y1={y} y2={y} stroke={stroke} strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
        ))}
      </svg>
    );
  }
  const inset = shot.frame === 'wide' ? 6 : 14;
  const a = inset;
  const b = 100 - inset;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      {corner(a, a, 1, 1)}
      {corner(b, a, -1, 1)}
      {corner(a, b, 1, -1)}
      {corner(b, b, -1, -1)}
      {/* thirds: the product sits in the middle third */}
      <line x1="33.3" x2="33.3" y1="0" y2="100" stroke="white" strokeOpacity="0.12" strokeWidth="0.3" />
      <line x1="66.6" x2="66.6" y1="0" y2="100" stroke="white" strokeOpacity="0.12" strokeWidth="0.3" />
      <line y1="33.3" y2="33.3" x1="0" x2="100" stroke="white" strokeOpacity="0.12" strokeWidth="0.3" />
      <line y1="66.6" y2="66.6" x1="0" x2="100" stroke="white" strokeOpacity="0.12" strokeWidth="0.3" />
      <path d="M50 47 V53 M47 50 H53" stroke={stroke} strokeWidth="0.5" />
    </svg>
  );
}

/**
 * Seller's Smart Product Camera: for the chosen kind of product it walks through the shots a
 * buyer wants to see (front, 45°, side, close-up, part number…) and says where to stand, how far
 * away, at what height, and whether the light and the phone's tilt are right. Every shot is a
 * suggestion: the seller can shoot in any order, skip, or upload from the device.
 */
export function SmartProductCamera({ profile, onProfileChange, onShot, onFile, onClose, onDone, busy }: Props) {
  const t = useTranslations('productCam');
  const tModal = useTranslations('photoModal');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<'none' | 'denied' | null>(null);
  const [index, setIndex] = React.useState(0);
  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  const [light, setLight] = React.useState<LightHint>('ok');
  const [flash, setFlash] = React.useState(false);

  const plan = SHOT_PLANS[profile];
  const shot = plan[Math.min(index, plan.length - 1)]!;
  const shotId = (s: ProductShot) => `${profile}:${s.key}`;
  const takenCount = plan.filter((s) => thumbs[shotId(s)]).length;
  const anyTaken = Object.keys(thumbs).length > 0;

  const { level, aligned, needsPermission, requestPermission } = useDeviceLevel(ready);
  const tilt: PitchHint | null = level ? pitchHint(level.pitch, shot.height) : null;
  const ok = ready && light === 'ok' && (tilt === null || tilt === 'ok');

  React.useEffect(() => {
    setIndex(0);
  }, [profile]);

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
          stream.getTracks().forEach((tr) => tr.stop());
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
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, []);

  // Light meter: a tiny grey-scale sample of the frame a few times a second.
  React.useEffect(() => {
    if (!ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const gray = new Uint8Array(SAMPLE_W * SAMPLE_H);
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      try {
        ctx.drawImage(v, 0, 0, SAMPLE_W, SAMPLE_H);
        const px = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
        for (let i = 0; i < gray.length; i++) gray[i] = (px[i * 4]! * 299 + px[i * 4 + 1]! * 587 + px[i * 4 + 2]! * 114) / 1000;
        const next = lightHint(gray, SAMPLE_W, SAMPLE_H);
        setLight((prev) => (prev === next ? prev : next));
      } catch {
        /* a frame that cannot be read is skipped */
      }
    }, 700);
    return () => window.clearInterval(id);
  }, [ready]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
    const full = canvas.toDataURL('image/jpeg', 0.9);

    const thumb = document.createElement('canvas');
    thumb.width = 120;
    thumb.height = Math.round((120 * canvas.height) / canvas.width);
    thumb.getContext('2d')?.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    const id = shotId(shot);
    setThumbs((prev) => ({ ...prev, [id]: thumb.toDataURL('image/jpeg', 0.7) }));

    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    onShot(full);

    // Next shot not taken yet (wraps around), or stay when all are done.
    const taken = new Set([...Object.keys(thumbs), id]);
    for (let step = 1; step <= plan.length; step++) {
      const j = (index + step) % plan.length;
      if (!taken.has(shotId(plan[j]!))) {
        setIndex(j);
        return;
      }
    }
  };

  const tip = !ready
    ? null
    : light !== 'ok'
      ? { tone: 'warn' as const, icon: <Sun className="h-3.5 w-3.5" />, text: t(`light.${light}`) }
      : tilt && tilt !== 'ok'
        ? { tone: 'warn' as const, icon: <Compass className="h-3.5 w-3.5" />, text: t(`pitch.${tilt}`) }
        : level
          ? { tone: 'ok' as const, icon: <Check className="h-3.5 w-3.5" />, text: t('ready') }
          : null;

  return (
    <div className="relative flex h-full w-full flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {flash && <div className="pointer-events-none absolute inset-0 z-30 bg-white/70" />}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="text-sm text-white/75">{error === 'none' ? tModal('camNone') : tModal('camDenied')}</p>
          </div>
        )}

        {ready && (
          <>
            <div className="pointer-events-none absolute inset-x-4 bottom-[132px] top-[150px] z-10 transition-colors">
              <FrameGuide shot={shot} ok={ok} />
            </div>
            {shot.height === 'level' && <LevelGuide level={level} aligned={aligned} />}
          </>
        )}

        {/* Top: close + what is being photographed */}
        <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-3 pb-6 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-2">
            <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
              {SHOT_PROFILES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onProfileChange?.(p)}
                  disabled={!onProfileChange}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    p === profile ? 'bg-gold-500 text-black' : 'bg-white/10 text-white/75 hover:bg-white/20'
                  } ${!onProfileChange && p !== profile ? 'hidden' : ''}`}
                >
                  {t(`profiles.${p}`)}
                </button>
              ))}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} aria-label={tModal('close')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/60">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Instruction card */}
          <div className="mt-3 flex gap-3 rounded-2xl bg-black/55 p-3 backdrop-blur-md">
            <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-white/[0.06]">
              <OrbitMap shot={shot} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-500">
                {t('step', { n: String(Math.min(index, plan.length - 1) + 1), total: String(plan.length) })}
              </p>
              <p className="text-sm font-semibold leading-tight">{t(`shots.${shot.key}.title`)}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/70">{t(`shots.${shot.key}.tip`)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-semibold text-white/80">
                <span className="rounded-full bg-white/10 px-2 py-0.5">↔ {formatDistance(shot.distance, t)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">↕ {t(`heights.${shot.height}`)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">▢ {t(`frames.${shot.frame}`)}</span>
              </div>
            </div>
          </div>

          {(tip || needsPermission) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {tip && (
                <span
                  role="status"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                    tip.tone === 'ok' ? 'bg-emerald-500/25 text-emerald-200' : 'bg-amber-500/25 text-amber-100'
                  }`}
                >
                  {tip.icon}
                  {tip.text}
                </span>
              )}
              {needsPermission && (
                <button type="button" onClick={() => void requestPermission()} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">
                  <Compass className="h-3.5 w-3.5" />
                  {t('sensor')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Shot strip */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
          <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto">
            {plan.map((s, i) => {
              const thumb = thumbs[shotId(s)];
              const active = i === index;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t(`shots.${s.key}.title`)}
                  aria-current={active ? 'step' : undefined}
                  className={`relative flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl text-[9px] font-semibold leading-tight transition ${
                    active ? 'ring-2 ring-gold-500' : 'ring-1 ring-white/20'
                  } ${thumb ? '' : 'bg-white/10 text-white/70'}`}
                >
                  {thumb ? (
                    <>
                      <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute end-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-black">
                        <Check className="h-3 w-3" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">{i + 1}</span>
                      <span className="line-clamp-2 px-0.5 text-center">{t(`shots.${s.key}.short`)}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {takenCount === plan.length && <p className="mt-2 text-center text-xs font-semibold text-emerald-300">{t('allDone')}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
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
        <button type="button" onClick={() => fileRef.current?.click()} className="flex w-[112px] items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-semibold transition hover:bg-white/20">
          <ImagePlus className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('upload')}</span>
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={!ready || busy}
          aria-label={tModal('shoot')}
          className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 transition active:scale-90 disabled:opacity-40 ${
            ok ? 'border-emerald-400 bg-white/20' : 'border-white/70 bg-white/15'
          }`}
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-7 w-7" />}
        </button>
        {onDone && anyTaken ? (
          <button type="button" onClick={onDone} className="flex w-[112px] items-center justify-center gap-1.5 rounded-full bg-gold-500 px-4 py-3 text-xs font-semibold text-black">
            <Check className="h-4 w-4" />
            {t('done', { count: String(Object.keys(thumbs).length) })}
          </button>
        ) : (
          <span className="w-[112px]" />
        )}
      </div>
    </div>
  );
}
