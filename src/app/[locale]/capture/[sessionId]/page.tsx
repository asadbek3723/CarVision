'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { LiveCamera } from '@/features/seller/components/LiveCamera';
import { fileToPhotoDataUrl } from '@/features/seller/lib/photo-input';

/** Phone side of the QR bridge: take a photo, it appears on the computer. */
export default function PhoneCapturePage() {
  const t = useTranslations('account');
  const params = useParams();
  const sessionId = params?.['sessionId'] as string;
  const [sent, setSent] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastShot, setLastShot] = React.useState<string | null>(null);

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
      if (!res.ok || !data.success) throw new Error(t('capErrSend'));
      setSent((n) => n + 1);
      setLastShot(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('capErrFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (lastShot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#07080B] p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-white">{t('capSentTitle')}</h1>
        <img src={lastShot} alt="" className="max-h-64 rounded-2xl" />
        <button type="button" onClick={() => setLastShot(null)} className="rounded-full bg-[#D4AE62] px-8 py-3 text-sm font-bold text-black">
          {t('capAgain', { n: sent })}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <LiveCamera
        busy={busy}
        onShot={(d) => void send(d)}
        onFile={(f) => {
          fileToPhotoDataUrl(f).then(send).catch((e: Error) => setError(e.message));
        }}
      />
      {error && <p role="alert" className="absolute inset-x-4 top-4 rounded-xl bg-red-500/90 px-4 py-3 text-center text-sm text-white">{error}</p>}
    </div>
  );
}
