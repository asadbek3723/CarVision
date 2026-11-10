'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApiError } from '@/lib/api-error';
import { useImageErrorText } from '@/features/seller/lib/use-image-error-text';
import { Check } from 'lucide-react';
import { SmartProductCamera } from '@/features/seller/components/SmartProductCamera';
import { SHOT_PROFILES, type ShotProfile } from '@/features/seller/lib/product-shots';
import { fileToPhotoDataUrl } from '@/features/seller/lib/photo-input';
import { buttonClasses } from '@/components/ui';

/** Phone side of the QR bridge: take photos with the smart camera, each one appears on the computer. */
function PhoneCapture() {
  const t = useTranslations('capturePage');
  const apiError = useApiError();
  const imgText = useImageErrorText();
  const params = useParams();
  const sessionId = params?.['sessionId'] as string;
  const search = useSearchParams();
  const initialProfile = search?.get('p');
  const [profile, setProfile] = React.useState<ShotProfile>(
    (SHOT_PROFILES as readonly string[]).includes(initialProfile ?? '') ? (initialProfile as ShotProfile) : 'part'
  );
  const [finished, setFinished] = React.useState(false);
  const [sent, setSent] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastShot, setLastShot] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/v1/camera-session/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'connected' }),
    }).catch(() => undefined);
  }, [sessionId]);

  const send = async (dataUrl: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/camera-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'captured', imageUrl: dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(apiError(data, t('errSend')));
      setSent((n) => n + 1);
      setLastShot(dataUrl);
      setNotice(true);
      window.setTimeout(() => setNotice(false), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errSend'));
    } finally {
      setBusy(false);
    }
  };

  if (finished && lastShot) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#07080B] p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{t('sent')}</h1>
        <img src={lastShot} alt="" className="max-h-64 rounded-2xl" />
        <button type="button" onClick={() => setFinished(false)} className={buttonClasses({ size: 'md' })}>
          {t('again', { count: sent })}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <SmartProductCamera
        profile={profile}
        onProfileChange={setProfile}
        onDone={() => setFinished(true)}
        busy={busy}
        onShot={(d) => void send(d)}
        onFile={(f) => {
          fileToPhotoDataUrl(f).then(send).catch((e: unknown) => setError(imgText.error(e, t('errSend'))));
        }}
      />
      {notice && <p role="status" className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-black">{t('sent')}</p>}
      {error && <p role="alert" className="absolute inset-x-4 top-4 rounded-xl bg-red-500/90 px-4 py-3 text-center text-sm text-white">{error}</p>}
    </div>
  );
}

// useSearchParams lives inside Suspense so the page can be prebuilt.
export default function PhoneCapturePage() {
  return (
    <React.Suspense fallback={null}>
      <PhoneCapture />
    </React.Suspense>
  );
}
