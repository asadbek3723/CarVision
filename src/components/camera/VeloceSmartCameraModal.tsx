'use client';

import * as React from 'react';
import {
  X,
  Upload,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ImageIcon,
  RotateCcw,
  ArrowRight,
  Wifi,
  WifiOff,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  SmartCameraLandscapeView,
  LuxuryCarCompass,
  SCAN_5_ANGLES,
} from '@/features/camera/components/SmartCameraLandscapeView';
import { compressFileToDataUrl, type CompressResult } from '@/features/camera/lib/image-compressor';
import { playLock, playShutter, vibrate } from '@/features/camera/lib/fx';
import { LuxuryQrCode } from '@/components/ui/LuxuryQrCode';

import { GUIDED_SCAN_ANGLES, REQUIRED_ANGLE_COUNT } from './scan-angles';

interface VeloceSmartCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured: (dataUrl: string, angles: Record<string, string>) => void;
}

export function VeloceSmartCameraModal({
  isOpen,
  onClose,
  onCaptured,
}: VeloceSmartCameraModalProps) {
  const t = useTranslations('scanModal');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const [isMobileDevice, setIsMobileDevice] = React.useState(false);
  const [desktopView, setDesktopView] = React.useState<'initial-choice' | 'step-upload'>(
    'initial-choice'
  );

  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [uploadedAngles, setUploadedAngles] = React.useState<Record<number, string>>({});
  const [isDragging, setIsDragging] = React.useState(false);

  const [sessionId, setSessionId] = React.useState<string>('');
  const [sessionStatus, setSessionStatus] = React.useState<
    'waiting' | 'connected' | 'captured'
  >('waiting');
  const [remoteCapturedCount, setRemoteCapturedCount] = React.useState<number>(0);
  const [copied, setCopied] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  // Monitor network connectivity for PWA Offline & Wi-Fi Bridge
  // Only while this window is open: nothing behind it (or in it) may scroll or rubber-band.
  // The component stays mounted when closed, so the lock must follow isOpen.
  React.useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, body.style.overscrollBehavior];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, body.style.overscrollBehavior] = prev as [string, string, string, string];
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mobileAnglesRef = React.useRef<Record<number, string>>({});

  // Detect mobile device reliably in BOTH portrait (375x812) AND landscape (844x390)
  React.useEffect(() => {
    const detectMobile = () => {
      if (typeof window === 'undefined') return;
      const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const shortestEdge = Math.min(window.innerWidth, window.innerHeight);
      const isCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setIsMobileDevice(uaMobile || shortestEdge <= 540 || (isCoarse && window.innerWidth <= 1024));
    };

    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, [isOpen]);

  // Reset state on opening
  React.useEffect(() => {
    if (isOpen) {
      setDesktopView('initial-choice');
      setCurrentStepIndex(0);
      setUploadedAngles({});
      mobileAnglesRef.current = {};
      setRemoteCapturedCount(0);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Create hand-off session for phone QR
  React.useEffect(() => {
    if (!isOpen || isMobileDevice) return;

    let isMounted = true;
    fetch('/api/v1/camera-session', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.session?.id) {
          setSessionId(data.session.id);
          setSessionStatus('waiting');
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, isMobileDevice]);

  // Safe navigation to Studio ONLY when all 5 required angles are present
  const handleProceedToStudio = React.useCallback(
    (customUrl?: string, customAngles?: Record<number, string>) => {
      const finalAngles = customAngles || uploadedAngles;
      const count = Object.keys(finalAngles).length;

      // Enforce mandatory all-angles rule unless customAngles has all required photos
      if (count < REQUIRED_ANGLE_COUNT && !customUrl) {
        return;
      }

      setIsProcessing(true);
      playLock();
      vibrate(50);

      const primaryUrl =
        customUrl ||
        finalAngles[1] ||
        Object.values(finalAngles)[0];

      if (!primaryUrl) return;

      // Every named angle gets its own real photo (keys match `FIVE_CAR_ANGLES` in the studio).
      const normalizedMultiAngles: Record<string, string> = { ...finalAngles };
      for (const angle of GUIDED_SCAN_ANGLES) {
        normalizedMultiAngles[angle.slug] = finalAngles[angle.id] || primaryUrl;
      }
      normalizedMultiAngles.side = normalizedMultiAngles.right!;
      normalizedMultiAngles.left = normalizedMultiAngles['front-left']!;

      // The store keeps the photos in memory (storage may be full) and opens the studio.
      setTimeout(() => {
        onCaptured(primaryUrl, normalizedMultiAngles);
        onClose();
      }, 600);
    },
    [uploadedAngles, onCaptured, onClose]
  );

  // Poll phone QR session status — waits until all 5 required angles are captured
  React.useEffect(() => {
    if (!isOpen || !sessionId || isMobileDevice) return;

    let busy = false;
    const interval = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        // 1. Cheap poll: status + number of uploaded photos only.
        const res = await fetch(`/api/v1/camera-session/${sessionId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!data.success || !data.session) return;
        setSessionStatus(data.session.status);
        setRemoteCapturedCount(Math.min(Number(data.session.uploads) || 0, REQUIRED_ANGLE_COUNT));

        // 2. Only when every photo should be there, download them once.
        if (data.session.status === 'captured' && Number(data.session.uploads) >= REQUIRED_ANGLE_COUNT) {
          const fullRes = await fetch(`/api/v1/camera-session/${sessionId}?full=1`, { cache: 'no-store' });
          const full = await fullRes.json();
          const remoteAngles: Record<number, string> = full.session?.angles || {};
          const count = Object.keys(remoteAngles).length;
          setRemoteCapturedCount(count);
          if (count >= REQUIRED_ANGLE_COUNT) {
            clearInterval(interval);
            handleProceedToStudio(remoteAngles[1] || full.session.imageUrl, remoteAngles);
          }
        }
      } catch {
        // Retry on the next tick
      } finally {
        busy = false;
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, sessionId, isMobileDevice, handleProceedToStudio]);

  if (!isOpen) return null;

  const currentAngle =
    GUIDED_SCAN_ANGLES[currentStepIndex] || GUIDED_SCAN_ANGLES[0]!;
  const angleTitle = t(`angles.${currentAngle.key}.title`);
  const currentAnglePhoto = uploadedAngles[currentAngle.id];
  const uploadedAngleIds = Object.keys(uploadedAngles).map(Number);
  const uploadedCount = uploadedAngleIds.length;
  const allAnglesUploaded = uploadedCount >= REQUIRED_ANGLE_COUNT;

  const sessionUrl =
    typeof window !== 'undefined' && sessionId
      ? `${window.location.origin}/${locale}/scan/${sessionId}`
      : '';

  const handleCopyLink = () => {
    if (!sessionUrl) return;
    navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const processUploadedFile = (file: File) => {
    const finish = (dataUrl: string) => {
      if (dataUrl) {
        playShutter();
        vibrate(30);
        const targetAngleId = currentAngle.id;
        setUploadedAngles((prev) => ({
          ...prev,
          [targetAngleId]: dataUrl,
        }));
        if (currentStepIndex < GUIDED_SCAN_ANGLES.length - 1) {
          const nextIdx = currentStepIndex + 1;
          setTimeout(() => {
            setCurrentStepIndex(nextIdx);
          }, 350);
        }
      }
    };
    void compressFileToDataUrl(file).then((small) => {
      if (small) return finish(small);
      // Not decodable by the browser: read it raw and let the pipeline reject it later
      const reader = new FileReader();
      reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processUploadedFile(file);
    }
  };

  // Mobile single angle captured -> store in uploadedAngles, wait until all 5 are captured
  const handleMobilePhotoCaptured = (
    result: CompressResult,
    angleId: number,
    allCaptured?: Record<number, CompressResult>
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        const next = { ...mobileAnglesRef.current, [angleId]: dataUrl };
        mobileAnglesRef.current = next;
        setUploadedAngles(next);

        const totalCaptured = allCaptured
          ? Object.keys(allCaptured).length
          : Object.keys(next).length;
        if (
          totalCaptured >= SCAN_5_ANGLES.length &&
          Object.keys(next).length >= SCAN_5_ANGLES.length
        ) {
          handleProceedToStudio(next[1] || dataUrl, next);
        }
      }
    };
    reader.readAsDataURL(result.blob);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050507] text-white">
      {/* 1. MOBILE ONLY: LIVE 1:1 SMART CAMERA (WITH MANDATORY LANDSCAPE LOCK & 5-ANGLE SEQUENCE) */}
      {isMobileDevice && (
        <div className="relative w-full h-full flex flex-col bg-[#050507]">
          <SmartCameraLandscapeView
            onPhotoCaptured={handleMobilePhotoCaptured}
            onClose={onClose}
            className="w-full h-full"
          />
        </div>
      )}

      {/* 2. DESKTOP VIEW: BORDERLESS, NO-BOX, STRICT ALL-5-ANGLES REQUIREMENT */}
      {!isMobileDevice && (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#07080B] px-8 py-5 sm:px-14 sm:py-6 md:px-20">
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute start-1/2 top-0 h-[450px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-500/8 via-gold-500/3 to-transparent blur-[140px]" />

          {/* Top Bar (Borderless) */}
          <div className="relative z-10 flex items-center justify-between pb-3">
            <div className="flex items-center gap-4">
              {desktopView === 'step-upload' && (
                <button
                  type="button"
                  onClick={() => setDesktopView('initial-choice')}
                  className="-ms-3 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/60 transition hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t('back')}</span>
                </button>
              )}
              {desktopView === 'initial-choice' && (
                <div>
                  <h1 className="text-xl sm:text-2xl font-light tracking-wide text-foreground">{t('titleChoice')}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('subChoice')}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 active:scale-95 transition cursor-pointer text-muted-foreground hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* VIEW A: INITIAL CHOICE (NO BOXES, SPACIOUS, LARGE QR CODE) */}
          <AnimatePresence mode="wait">
            {desktopView === 'initial-choice' && (
              <motion.div
                key="initial-choice"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="relative z-10 flex-1 flex flex-col justify-center my-auto py-6 max-w-6xl mx-auto w-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-11 gap-12 md:gap-14 items-start">
                  {/* LEFT: PHONE SCAN WITH LARGE 300px QR CODE */}
                  <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-start space-y-7">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
                        {t('phoneTitle')}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {t('phoneSub')}
                      </p>
                    </div>

                    {/* Prominent Large QR Code (300px) */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
                      {sessionUrl ? (
                        <LuxuryQrCode
                          value={sessionUrl}
                          size={300}
                          finderCornerRadius={2.2}
                          className="rounded-2xl"
                        />
                      ) : (
                        <div className="h-[300px] w-[300px] grid place-items-center bg-neutral-100 rounded-2xl">
                          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Status & Copy Action */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
 sessionStatus === 'captured'
 ? 'bg-emerald-400'
                              : sessionStatus === 'connected'
                              ? 'bg-gold-500'
                              : !isOnline
                              ? 'bg-amber-500'
                              : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                        <span>
                          {sessionStatus === 'captured'
                            ? t('statusCaptured', { total: REQUIRED_ANGLE_COUNT })
                            : sessionStatus === 'connected'
                            ? t('statusConnected', { captured: remoteCapturedCount, total: REQUIRED_ANGLE_COUNT })
                            : !isOnline
                            ? t('statusOffline')
                            : t('statusWaiting')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-white transition cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>{t('copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>{t('copyLink')}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* PWA Offline & Wi-Fi Bridge Pill Indicator */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-0.5">
                      <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-gold-500/90">
                        {isOnline ? (
                          <Wifi className="h-3 w-3 text-gold-500" />
                        ) : (
                          <WifiOff className="h-3 w-3 text-amber-400" />
                        )}
                        <span>{t('offlineBridge')}</span>
                        <ShieldCheck className="h-3 w-3 text-emerald-400 ms-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Subtle Airy Divider */}
                  <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center pt-16">
                    <div className="w-px h-96 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                  </div>

                  {/* RIGHT: PC UPLOAD WITH LARGE REALISTIC CAR SILHOUETTE */}
                  <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-start space-y-7">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
                        {t('computerTitle')}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {t('computerSub')}
                      </p>
                    </div>

                    {/* Realistic Top-Down Car Silhouette & Centered Action */}
                    <div className="w-full flex flex-col items-center justify-center">
                      <div className="relative w-full max-w-[340px] h-[300px] flex items-center justify-center">
                        <div className="absolute inset-0 bg-gold-500/5 blur-3xl rounded-full pointer-events-none" />
                        <img
                          src="/images/camera/topdown_coupe.png"
                          alt={t('silhouetteAlt')}
                          className="relative h-[270px] sm:h-[290px] w-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] select-none pointer-events-none transition-transform duration-500 hover:scale-[1.02]"
                        />
                      </div>

                      {/* Action Button Centered Directly Below Car */}
                      <div className="flex flex-col items-center justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setDesktopView('step-upload')}
                          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gold-gradient py-3.5 px-8 sm:py-4 sm:px-9 text-sm sm:text-base font-semibold text-black tracking-wide transition hover:brightness-110 active:scale-98 shadow-gold cursor-pointer"
                        >
                          <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>{t('uploadPhotos')}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-muted-foreground/75 mt-2.5 text-center">
                          {t('oneHint')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW B: STEP-BY-STEP GUIDED WIZARD (STRICT PROGRAM-DRIVEN SEQUENCE) */}
            {desktopView === 'step-upload' && (
              <motion.div
                key="step-upload"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col justify-center gap-8 py-2"
              >
                {/* 4-Step Program-Controlled Progress Bar (Cannot Skip Ahead!) */}
                <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full pb-3">
                  {GUIDED_SCAN_ANGLES.map((angle, idx) => {
                    const isUploaded = Boolean(uploadedAngles[angle.id]);
                    const isActive = idx === currentStepIndex;
                    // Only allow clicking back to already-uploaded steps; cannot skip forward
                    const canNavigate = isUploaded || idx <= currentStepIndex;

                    return (
                      <button
                        key={angle.id}
                        type="button"
                        disabled={!canNavigate}
                        onClick={() => {
                          if (canNavigate) setCurrentStepIndex(idx);
                        }}
                        className={`relative flex items-center justify-center sm:justify-start gap-3 py-2.5 px-3 transition text-start ${
                          isActive
                            ? 'text-gold-500'
                            : isUploaded
                            ? 'text-emerald-400 cursor-pointer'
                            : 'text-white/30 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
 isUploaded
 ? 'bg-emerald-500/20 text-emerald-400'
                              : isActive
                              ? 'bg-gold-500 text-black font-extrabold shadow-[0_0_16px_rgba(212,174,98,0.5)]'
                              : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {isUploaded ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs sm:text-sm font-medium truncate">
                            {t(`angles.${angle.key}.title`)}
                          </span>
                          <span className="hidden sm:block text-[10px] text-white/40">
                            {isUploaded
                              ? t('stUploaded')
                              : isActive
                              ? t('stNext')
                              : t('stWaiting')}
                          </span>
                        </div>

                        {/* Active Gold Indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeAngleTabUnderline"
                            className="absolute -bottom-1 inset-x-3 h-0.5 bg-gold-500 shadow-[0_0_8px_#D4AE62]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Main Stage: Non-Clickable 3D Car Compass Guide + Mandatory Step Upload */}
                <div className="grid grid-cols-1 lg:grid-cols-11 gap-8 lg:gap-12 items-center py-2">
                  {/* LEFT: Program-Driven 3D Car Compass (Non-clickable arrows) */}
                  <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-start space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-light text-foreground tracking-tight">
                        {angleTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {t(`angles.${currentAngle.key}.guide`)}
                      </p>
                    </div>

                    {/* Non-clickable 4-Direction Car Compass */}
                    <div className="relative mx-auto my-2 flex items-center justify-center">
                      <LuxuryCarCompass
                        activeAngleId={currentAngle.id}
                        completedAngles={uploadedAngleIds}
                        size="xl"
                      />
                    </div>
                  </div>

                  {/* CENTER: Subtle Airy Divider */}
                  <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center">
                    <div className="w-px h-72 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                  </div>

                  {/* RIGHT: Open Upload Area (Mandatory Current Step) */}
                  <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-start space-y-4">
                    <input
                      ref={fileInputRef}
                      data-testid="smart-camera-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />


                    {/* Borderless Interactive Upload Drop Target */}
                    <div className="w-full">
                      {currentAnglePhoto ? (
                        <div className="relative flex h-[22rem] w-full select-none flex-col items-center justify-center xl:h-[26rem]">
                          <img
                            src={currentAnglePhoto}
                            alt={angleTitle}
                            className="max-h-[17rem] w-auto max-w-full rounded-2xl object-contain shadow-[0_24px_60px_rgba(0,0,0,0.95)] xl:max-h-[20rem]"
                          />

                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{t('angleSaved', { angle: angleTitle })}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-white hover:bg-white/20 transition cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>{t('replace')}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className="group relative flex h-[22rem] w-full cursor-pointer select-none flex-col items-center justify-center text-center transition xl:h-[26rem]"
                        >
                          {/* Ambient glow on hover/drag */}
                          <div
                            className={`absolute inset-0 rounded-3xl transition-opacity pointer-events-none ${
 isDragging
 ? 'bg-gold-500/10 opacity-100 blur-2xl'
                                : 'opacity-0 group-hover:opacity-100 bg-gold-500/5 blur-3xl'
                            }`}
                          />

                          <div className="relative z-10 flex flex-col items-center space-y-5">
                            <div className="grid h-24 w-24 place-items-center rounded-full bg-white/[0.04] text-gold-500 transition duration-300 group-hover:scale-105 group-hover:bg-gold-500/15">
                              <Upload className="h-10 w-10 stroke-[1.5]" />
                            </div>

                            <div className="space-y-1">
                              <p className="text-lg font-medium text-foreground">
                                {t('clickToPick', { angle: angleTitle })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t('formats')}
                              </p>
                            </div>

                            <div className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-gold-gradient px-8 text-base font-semibold tracking-wide text-black shadow-gold transition group-hover:brightness-110 active:scale-98">
                              <ImageIcon className="h-5 w-5" />
                              <span>{t('pickBtn', { angle: t(`angles.${currentAngle.key}.short`) })}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mandatory All-Angles Status & Davom Etish Gate */}
                    <div className="w-full pt-2 space-y-3">

                      <div className="w-full flex items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={currentStepIndex === 0}
                          onClick={() =>
                            setCurrentStepIndex((prev) => Math.max(0, prev - 1))
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-white disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>{t('prev')}</span>
                        </button>

                        <div className="flex items-center gap-2.5">
                          {currentStepIndex < GUIDED_SCAN_ANGLES.length - 1 && (
                            <button
                              type="button"
                              disabled={!currentAnglePhoto}
                              onClick={() => {
                                if (!currentAnglePhoto) return;
                                setCurrentStepIndex((prev) =>
                                  Math.min(GUIDED_SCAN_ANGLES.length - 1, prev + 1)
                                );
                              }}
                              className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer"
                            >
                              <span>{t('nextAngle')}</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={!allAnglesUploaded}
                            onClick={() => {
                              if (!allAnglesUploaded) return;
                              handleProceedToStudio();
                            }}
                            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-semibold tracking-wide transition ${
 allAnglesUploaded
 ? 'bg-gold-gradient text-black shadow-gold hover:brightness-110 active:scale-95 cursor-pointer'
                                : 'bg-white/5 text-white/30 cursor-not-allowed'
                            }`}
                          >
                            {!allAnglesUploaded && <Lock className="h-3.5 w-3.5" />}
                            <span>
                              {t('continue', { uploaded: uploadedCount, total: REQUIRED_ANGLE_COUNT })}
                            </span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimalist Loading Overlay */}
          {isProcessing && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080B]/95 backdrop-blur-xl">
              <div className="h-14 w-14 rounded-full border-2 border-t-gold-500 animate-spin mb-4" />
              <p className="text-xs font-medium text-muted-foreground">
                {t('processing')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
