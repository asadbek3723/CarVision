'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { GUIDED_SCAN_ANGLES } from '@/components/camera/scan-angles';
import { useTranslations } from 'next-intl';
import {
  SmartCameraLandscapeView,
  SCAN_5_ANGLES,
} from '@/features/camera/components/SmartCameraLandscapeView';
import { shrinkImageBlob, type CompressResult } from '@/features/camera/lib/image-compressor';
import {
  CheckCircle2,
  Monitor,
  Sparkles,
  WifiOff,
  Wifi,
  RefreshCw,
  HardDriveDownload,
  ShieldCheck,
} from 'lucide-react';
import {
  saveOfflinePhoto,
  getPendingPhotos,
  updatePhotoStatus,
  registerAutoSync,
  deleteOfflinePhoto,
} from '@/lib/offline-photo-queue';

const REQUIRED_ANGLES_TOTAL = SCAN_5_ANGLES.length;

export default function MobileScanSessionPage() {
  const t = useTranslations('scanLive');
  const tAcc = useTranslations('account');
  const params = useParams();
  // The computer asked for one side only (`?only=rear`): the camera opens on it and finishes after it.
  const onlySlug = useSearchParams()?.get('only');
  const onlyAngleId = GUIDED_SCAN_ANGLES.find((a) => a.slug === onlySlug)?.id;
  const sessionId = params?.['sessionId'] as string;

  const [isTransferred, setIsTransferred] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [offlinePending, setOfflinePending] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastCapturedDataUrl, setLastCapturedDataUrl] = React.useState<string | null>(null);
  const [isManualRetrying, setIsManualRetrying] = React.useState(false);
  const [syncedAngleIds, setSyncedAngleIds] = React.useState<number[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Check pending offline photos on load
  const checkAndSyncPending = React.useCallback(async () => {
    if (!sessionId) return;
    try {
      const pending = await getPendingPhotos(sessionId);
      setPendingCount(pending.length);
      if (pending.length > 0 && navigator.onLine) {
        setIsUploading(true);
        for (const item of pending) {
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (dataUrl) {
              const res = await fetch(`/api/v1/camera-session/${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'connected',
                  imageUrl: dataUrl,
                  angleId: item.angleId,
                }),
              });
              if (res.ok) {
                await updatePhotoStatus(item.id, 'SYNCED');
                await deleteOfflinePhoto(item.id);
                setSyncedAngleIds((prev) => {
                  const next = prev.includes(item.angleId)
                    ? prev
                    : [...prev, item.angleId];
                  if (next.length >= REQUIRED_ANGLES_TOTAL) {
                    void fetch(`/api/v1/camera-session/${sessionId}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'captured' }),
                    }).then(() => {
                      setOfflinePending(false);
                      setIsUploading(false);
                      setIsTransferred(true);
                    });
                  } else {
                    setOfflinePending(false);
                    setIsUploading(false);
                  }
                  return next;
                });
              }
            }
          };
          void shrinkImageBlob(item.blob)
            .catch(() => item.blob)
            .then((small) => reader.readAsDataURL(small));
        }
      }
    } catch {
      // IndexedDB resilience
    }
  }, [sessionId]);

  // Monitor network status
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      void checkAndSyncPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionId, checkAndSyncPending]);

  // Send heartbeat / connection notification
  React.useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/camera-session/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'connected' }),
    }).catch(() => {});

    void checkAndSyncPending();

    const cleanup = registerAutoSync(async (photo) => {
      if (photo.sessionId !== sessionId) return false;
      return true;
    });

    return cleanup;
  }, [sessionId, checkAndSyncPending]);

  // Direct upload dispatcher with offline queue fallback — requires all 5 angles before completing
  const uploadPhotoData = React.useCallback(
    async (dataUrl: string, blob: Blob, angleId: number, totalCapturedCount: number) => {
      const isFinalAngle = totalCapturedCount >= REQUIRED_ANGLES_TOTAL;
      if (isFinalAngle) {
        setIsUploading(true);
      }

      const photoId = `photo_${Date.now()}_${angleId}`;

      // 1. Immediately persist to client-side IndexedDB for zero data-loss guarantee
      try {
        await saveOfflinePhoto({
          id: photoId,
          sessionId,
          angleId,
          blob,
        });
      } catch (err) {
        console.warn('IndexedDB write warning:', err);
      }

      // 2. If phone is offline, transition into offline pending mode without losing state
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsUploading(false);
        setOfflinePending(true);
        setPendingCount((c) => c + 1);
        setLastCapturedDataUrl(dataUrl);
        return;
      }

      // 3. Attempt direct transfer to local / cloud server
      try {
        const response = await fetch(`/api/v1/camera-session/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: isFinalAngle ? 'captured' : 'connected',
            imageUrl: dataUrl,
            angleId,
          }),
        });

        if (response.ok) {
          await updatePhotoStatus(photoId, 'SYNCED');
          await deleteOfflinePhoto(photoId);
          setSyncedAngleIds((prev) =>
            prev.includes(angleId) ? prev : [...prev, angleId]
          );
          setUploadError(null);
          if (isFinalAngle) {
            setIsUploading(false);
            setOfflinePending(false);
            setIsTransferred(true);
          }
          return;
        }

        // A 4xx means the server understood and refused (too big / session expired): queueing the
        // very same photo again would fail forever, so say what happened instead.
        if (response.status >= 400 && response.status < 500) {
          await deleteOfflinePhoto(photoId).catch(() => undefined);
          setIsUploading(false);
          setUploadError(
            response.status === 404
              ? tAcc('scanErrExpired')
              : tAcc('scanErrUpload')
          );
          return;
        }
        throw new Error('Server upload rejected');
      } catch (err) {
        console.warn('Network upload failed, keeping in offline fallback queue:', err);
        await updatePhotoStatus(
          photoId,
          'FAILED',
          err instanceof Error ? err.message : 'Upload failed'
        );
        setIsUploading(false);
        setOfflinePending(true);
        setPendingCount((c) => c + 1);
        setLastCapturedDataUrl(dataUrl);
      }
    },
    [sessionId, tAcc]
  );

  // Uploads still on their way: "Done" waits for them before telling the computer to continue.
  const inFlight = React.useRef<Set<Promise<void>>>(new Set());

  const handlePhotoCaptured = (
    result: CompressResult,
    angleId: number,
    allCaptured?: Record<number, CompressResult>
  ) => {
    const count = allCaptured ? Object.keys(allCaptured).length : syncedAngleIds.length + 1;
    // iOS may hand back an oversized PNG: always bring it under the upload limit first.
    const job: Promise<void> = shrinkImageBlob(result.blob)
      .catch(() => result.blob)
      .then(
        (blob) =>
          new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : '';
              if (dataUrl) void uploadPhotoData(dataUrl, blob, angleId, count).finally(resolve);
              else resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(blob);
          })
      )
      .finally(() => inFlight.current.delete(job));
    inFlight.current.add(job);
  };

  /** "Done" with 1 to 4 photos: once they are uploaded, the computer opens the studio with them. */
  const handleFinish = async () => {
    setIsUploading(true);
    await Promise.allSettled([...inFlight.current]);
    try {
      const res = await fetch(`/api/v1/camera-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'captured' }),
      });
      if (res.ok) setIsTransferred(true);
      else setUploadError(res.status === 404 ? tAcc('scanErrExpired') : tAcc('scanErrUpload'));
    } catch {
      setUploadError(tAcc('scanErrUpload'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualRetry = async () => {
    setIsManualRetrying(true);
    await checkAndSyncPending();
    setTimeout(() => setIsManualRetrying(false), 800);
  };

  const handleDownloadBackup = () => {
    if (!lastCapturedDataUrl) return;
    const a = document.createElement('a');
    a.href = lastCapturedDataUrl;
    a.download = `carvision-backup-${sessionId}.webp`;
    a.click();
  };

  if (isTransferred) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080B] p-6 text-center text-white">
        <div className="relative mb-6">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#242735] to-[#12141A] ring-2 ring-gold-500 shadow-[0_0_36px_rgba(232,191,116,0.5)]">
            <CheckCircle2 className="h-12 w-12 text-gold-500" />
          </div>
          <span className="absolute -top-1 -end-1">
            <Sparkles className="h-6 w-6 text-gold-500 animate-bounce" />
          </span>
        </div>

        <h1 className="font-display text-xl sm:text-2xl font-light tracking-[0.25em] text-foreground uppercase">
          {t('doneTitle', { total: syncedAngleIds.length || REQUIRED_ANGLES_TOTAL })}
        </h1>

        <p className="mt-3 max-w-xs font-display text-xs sm:text-sm font-light tracking-wider text-gold-500 leading-relaxed">
          {t('doneBody')}
        </p>

        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-surface-1 ring-1 ring-gold-500/20 px-6 py-4 shadow-card">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium tracking-wide text-white">
            {t('doneNext')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] flex flex-col">
      {/* Network indicator badge at the top */}
      <div className="absolute top-3 end-4 z-40 pointer-events-none">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] backdrop-blur-md ring-1 ${
 isOnline
 ? 'bg-black/50 text-emerald-400 ring-emerald-500/25'
              : 'bg-black/70 text-amber-400 ring-amber-500/35'
          }`}
        >
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{isOnline ? t('handoff', { synced: syncedAngleIds.length, total: REQUIRED_ANGLES_TOTAL }) : t('offline')}</span>
        </div>
      </div>

      <SmartCameraLandscapeView
        onPhotoCaptured={handlePhotoCaptured}
        onFinish={() => void handleFinish()}
        onlyAngleId={onlyAngleId}
        className="w-full h-full"
      />

      {uploadError && (
        <div role="alert" className="absolute inset-x-4 top-12 z-[60] flex items-start gap-3 rounded-2xl bg-red-500/95 px-4 py-3 text-sm text-white shadow-xl">
          <span className="flex-1">{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="shrink-0 cursor-pointer font-bold underline">
            OK
          </button>
        </div>
      )}

      {/* Uploading Spinner */}
      {isUploading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="h-16 w-16 rounded-full border-2 border-t-gold-500 animate-spin" />
          <p className="mt-4 text-xs font-mono tracking-wider text-gold-500">
            {t('sending', { total: REQUIRED_ANGLES_TOTAL })}
          </p>
        </div>
      )}

      {/* PWA Offline Handoff & Ustaxona Wi-Fi Fallback Drawer/Banner */}
      {offlinePending && (
        <div className="absolute inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black via-[#0D0E12] to-transparent p-5 pb-8 flex flex-col items-center text-center">
          <div className="w-full max-w-md rounded-3xl bg-surface-1/95 ring-1 ring-gold-500/30 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <WifiOff className="h-4 w-4" />
                <span>{t('slow')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gold-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t('saved', { count: pendingCount > 0 ? pendingCount : 1 })}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 mt-2 text-start leading-relaxed">
              {t('savedBody')}
            </p>

            <div className="flex items-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={handleManualRetry}
                disabled={isManualRetrying}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-[#B38C3F] text-black font-semibold text-xs py-3 px-4 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(232,191,116,0.3)]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isManualRetrying ? 'animate-spin' : ''}`} />
                <span>{t('retry')}</span>
              </button>

              {lastCapturedDataUrl && (
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs py-3 px-3 transition active:scale-95 cursor-pointer"
                  title={t('downloadTitle')}
                >
                  <HardDriveDownload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('download')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
