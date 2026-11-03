'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Check, Copy, ImagePlus, Loader2, X } from 'lucide-react';
import { useImageErrorText } from '@/features/seller/lib/use-image-error-text';
import { LuxuryQrCode } from '@/components/ui/LuxuryQrCode';
import { LiveCamera } from './LiveCamera';
import { fileToPhotoDataUrl } from '../lib/photo-input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Receives a compressed JPEG data URL. */
  onPhoto: (dataUrl: string) => void;
}

function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return ua || (coarse && window.innerWidth <= 1024) || Math.min(window.innerWidth, window.innerHeight) <= 540;
}

/**
 * Phone: opens the live camera at once (upload-from-device at the bottom).
 * Computer: QR code (take the photo with the phone, it appears here) and "upload from device".
 */
export function ProductPhotoModal({ isOpen, onClose, onPhoto }: Props) {
  const t = useTranslations('photoModal');
  const tImg = useTranslations('imageErrors');
  const imgText = useImageErrorText();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const [mobile, setMobile] = React.useState<boolean | null>(null);
  const [sessionId, setSessionId] = React.useState('');
  const [status, setStatus] = React.useState<'waiting' | 'connected' | 'captured'>('waiting');
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const lastSeen = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isOpen) setMobile(detectMobile());
  }, [isOpen]);

  // Desktop: create the hand-off session and watch it
  React.useEffect(() => {
    if (!isOpen || mobile !== false) return;
    let cancelled = false;
    lastSeen.current = null;
    setStatus('waiting');
    fetch('/api/v1/camera-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'product' }) })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setSessionId(d.session.id);
        else if (!cancelled) setError(d.error || t('qrError'));
      })
      .catch(() => !cancelled && setError(t('qrError')));
    return () => {
      cancelled = true;
    };
  }, [isOpen, mobile, t]);

  React.useEffect(() => {
    if (!isOpen || mobile !== false || !sessionId) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/camera-session/${sessionId}`, { cache: 'no-store' });
        const d = await res.json();
        if (!d.success) return;
        setStatus(d.session.status);
        const img: string | undefined = d.session.imageUrl;
        if (img && img !== lastSeen.current) {
          lastSeen.current = img;
          onPhoto(img);
        }
      } catch {
        // retry on the next tick
      }
    }, 1000);
    return () => clearInterval(t);
  }, [isOpen, mobile, sessionId, onPhoto]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onPhoto(await fileToPhotoDataUrl(file));
    } catch (err) {
      setError(imgText.error(err, tImg('upload')));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen || mobile === null) return null;

  const url = sessionId && typeof window !== 'undefined' ? `${window.location.origin}/${locale}/capture/${sessionId}` : '';

  if (mobile) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        <LiveCamera busy={busy} onShot={onPhoto} onFile={(f) => void handleFile(f)} />
        <button type="button" onClick={onClose} aria-label={t('close')} className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white">
          <X className="h-5 w-5" />
        </button>
        {error && <p role="alert" className="absolute inset-x-4 top-16 rounded-xl bg-red-500/90 px-4 py-3 text-center text-sm text-white">{error}</p>}
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-xl">
      <div className="relative w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#0B0D13] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
        <button type="button" onClick={onClose} aria-label={t('close')} className="absolute end-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-2xl font-light text-white">{t('title')}</h2>
        <p className="mt-1 text-sm text-white/50">{t('subtitle')}</p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* QR */}
          <section className="flex flex-col items-center text-center">
            <h3 className="text-lg font-light text-white">{t('scanTitle')}</h3>
            <p className="mt-1 text-sm text-white/50">{t('scanSub')}</p>
            <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              {url ? (
                <LuxuryQrCode value={url} size={240} finderCornerRadius={2.2} className="rounded-2xl" />
              ) : (
                <div className="grid h-[240px] w-[240px] place-items-center rounded-2xl bg-neutral-100">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-white/60">
              <span className={`h-2.5 w-2.5 rounded-full ${status === 'captured' ? 'bg-emerald-400' : status === 'connected' ? 'bg-[#D4AE62]' : 'animate-pulse bg-amber-400'}`} />
              {status === 'captured' ? t('statusCaptured') : status === 'connected' ? t('statusConnected') : t('statusWaiting')}
            </p>
            {url && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t('copied') : t('copyLink')}
              </button>
            )}
          </section>

          {/* Upload */}
          <section className="flex flex-col items-center text-center">
            <h3 className="text-lg font-light text-white">{t('deviceTitle')}</h3>
            <p className="mt-1 text-sm text-white/50">{t('deviceSub')}</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files?.[0]); }}
              className={`mt-5 flex h-[272px] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed transition ${dragging ? 'border-[#D4AE62] bg-[#D4AE62]/10' : 'border-white/20 bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              {busy ? <Loader2 className="h-10 w-10 animate-spin text-[#D4AE62]" /> : <ImagePlus className="h-10 w-10 text-[#D4AE62]" />}
              <span className="text-sm font-semibold text-white">{t('dropHint')}</span>
              <span className="text-xs text-white/40">{t('formats')}</span>
            </button>
          </section>
        </div>
        {error && <p role="alert" className="mt-6 text-center text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
