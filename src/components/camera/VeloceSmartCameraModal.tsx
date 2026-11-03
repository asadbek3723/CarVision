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
import { useParams, useRouter } from 'next/navigation';
import {
  SmartCameraLandscapeView,
  LuxuryCarCompass,
  SCAN_5_ANGLES,
} from '@/features/camera/components/SmartCameraLandscapeView';
import { compressFileToDataUrl, type CompressResult } from '@/features/camera/lib/image-compressor';
import { playLock, playShutter, vibrate } from '@/features/camera/lib/fx';
import { LuxuryQrCode } from '@/components/ui/LuxuryQrCode';

export interface GuidedScanAngle {
  id: number;
  key: 'front' | 'right' | 'rear' | 'left';
  title: string;
  shortTitle: string;
  guideInstruction: string;
  coneAngle: number;
  isPrimary?: boolean;
}

/**
 * 4 Mandatory Program-Driven Angles matching the 4-way Car Compass 1:1.
 * Users MUST upload/capture all 4 sides in sequence; skipping is forbidden.
 */
export const GUIDED_SCAN_ANGLES: GuidedScanAngle[] = [
  {
    id: 1,
    key: 'front',
    title: 'Old tomon',
    shortTitle: 'Oldi',
    guideInstruction: 'Mashinaning old tomonini to‘g‘ridan rasmga oling yoki yuklang.',
    coneAngle: 0,
    isPrimary: true,
  },
  {
    id: 2,
    key: 'right',
    title: 'O‘ng tomon',
    shortTitle: 'O‘ng',
    guideInstruction: 'Mashinaning o‘ng yon tomonini to‘liq ko‘rinishda yuklang.',
    coneAngle: 90,
  },
  {
    id: 3,
    key: 'rear',
    title: 'Orqa tomon',
    shortTitle: 'Orqa',
    guideInstruction: 'Mashinaning orqa tomonini to‘g‘ridan ko‘rinishda yuklang.',
    coneAngle: 180,
  },
  {
    id: 4,
    key: 'left',
    title: 'Chap tomon',
    shortTitle: 'Chap',
    guideInstruction: 'Mashinaning chap yon tomonini to‘liq ko‘rinishda yuklang.',
    coneAngle: 270,
  },
];

const REQUIRED_ANGLE_COUNT = GUIDED_SCAN_ANGLES.length;

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
  const router = useRouter();
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

  // Safe navigation to Studio ONLY when all 4 required angles are present
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

      const normalizedMultiAngles: Record<string, string> = {
        ...finalAngles,
        front: finalAngles[1] || primaryUrl,
        right: finalAngles[2] || primaryUrl,
        side: finalAngles[2] || primaryUrl,
        rear: finalAngles[3] || primaryUrl,
        left: finalAngles[4] || primaryUrl,
        'front-left': finalAngles[1] || primaryUrl,
        'rear-right': finalAngles[3] || finalAngles[2] || primaryUrl,
      };

      // The store keeps the photos in memory (storage may be full) and opens the studio.
      setTimeout(() => {
        onCaptured(primaryUrl, normalizedMultiAngles);
        onClose();
      }, 600);
    },
    [uploadedAngles, onCaptured, onClose]
  );

  // Poll phone QR session status — waits until all 4 required angles are captured
  React.useEffect(() => {
    if (!isOpen || !sessionId || isMobileDevice) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/camera-session/${sessionId}`);
        const data = await res.json();
        if (data.success && data.session) {
          setSessionStatus(data.session.status);
          const remoteAngles: Record<number, string> = data.session.angles || {};
          const count = Object.keys(remoteAngles).length;
          setRemoteCapturedCount(count);

          if (
            data.session.status === 'captured' &&
            count >= REQUIRED_ANGLE_COUNT
          ) {
            clearInterval(interval);
            const primary = remoteAngles[1] || data.session.imageUrl;
            handleProceedToStudio(primary, remoteAngles);
          }
        }
      } catch {
        // Retry
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isOpen, sessionId, isMobileDevice, handleProceedToStudio]);

  if (!isOpen) return null;

  const currentAngle =
    GUIDED_SCAN_ANGLES[currentStepIndex] || GUIDED_SCAN_ANGLES[0]!;
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

  // Mobile single angle captured -> store in uploadedAngles, wait until all 4 are captured
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
      {/* 1. MOBILE ONLY: LIVE 1:1 SMART CAMERA (WITH MANDATORY LANDSCAPE LOCK & 4-ANGLE SEQUENCE) */}
      {isMobileDevice && (
        <div className="relative w-full h-full flex flex-col bg-[#050507]">
          <SmartCameraLandscapeView
            onPhotoCaptured={handleMobilePhotoCaptured}
            onClose={onClose}
            className="w-full h-full"
          />
        </div>
      )}

      {/* 2. DESKTOP VIEW: BORDERLESS, NO-BOX, STRICT ALL-4-ANGLES REQUIREMENT */}
      {!isMobileDevice && (
        <div className="relative min-h-screen w-full flex flex-col bg-[#07080B] px-8 sm:px-14 md:px-20 py-5 sm:py-6 overflow-y-auto">
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute start-1/2 top-0 h-[450px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#D4AE62]/8 via-[#D4AE62]/3 to-transparent blur-[140px]" />

          {/* Top Bar (Borderless) */}
          <div className="relative z-10 flex items-center justify-between pb-3">
            <div className="flex items-center gap-4">
              {desktopView === 'step-upload' && (
                <button
                  type="button"
                  onClick={() => setDesktopView('initial-choice')}
                  className="flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Orqaga</span>
                </button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-light tracking-wide text-foreground">
                  {desktopView === 'initial-choice'
                    ? 'Mashinani suratga olish'
                    : 'Mashina suratlari'}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {desktopView === 'initial-choice'
                    ? 'Suratni telefon yoki kompyuteringiz orqali kiriting'
                    : `Rakurs: ${currentStepIndex + 1} / ${REQUIRED_ANGLE_COUNT} · Yuklandi: ${uploadedCount} / ${REQUIRED_ANGLE_COUNT}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
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
                        Telefonda skanerlash
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        Telefoningiz kamerasi bilan QR kodni skanerlang
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
                              ? 'bg-[#D4AE62]'
                              : !isOnline
                              ? 'bg-amber-500'
                              : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                        <span>
                          {sessionStatus === 'captured'
                            ? 'Barcha 4 ta surat qabul qilindi!'
                            : sessionStatus === 'connected'
                            ? `Telefon ulandi · ${remoteCapturedCount} / ${REQUIRED_ANGLE_COUNT} rakurs olindi`
                            : !isOnline
                            ? 'Oflayn rejim — Mahalliy Wi-Fi bridge'
                            : 'Ulanish kutilmoqda...'}
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
                            <span>Nusxalandi</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Havolani nusxalash</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* PWA Offline & Wi-Fi Bridge Pill Indicator */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-0.5">
                      <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[#D4AE62]/90">
                        {isOnline ? (
                          <Wifi className="h-3 w-3 text-[#D4AE62]" />
                        ) : (
                          <WifiOff className="h-3 w-3 text-amber-400" />
                        )}
                        <span>PWA Offline Handoff & Ustaxona Wi-Fi Bridge</span>
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
                        Kompyuterdan yuklash
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        Fotosuratlarni kompyuteringizdan bosqichma-bosqich kiriting
                      </p>
                    </div>

                    {/* Realistic Top-Down Car Silhouette & Centered Action */}
                    <div className="w-full flex flex-col items-center justify-center">
                      <div className="relative w-full max-w-[340px] h-[300px] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#D4AE62]/5 blur-3xl rounded-full pointer-events-none" />
                        <img
                          src="/images/camera/topdown_coupe.png"
                          alt="Avtomobil silueti"
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
                          <span>Rasmlarni yuklash</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-muted-foreground/75 mt-2.5 text-center">
                          Istalgan paytda 1 ta rasm bilan ham davom etishingiz mumkin
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
                className="relative z-10 flex-1 flex flex-col justify-between my-auto py-2 sm:py-3 max-w-6xl mx-auto w-full space-y-4 sm:space-y-5"
              >
                {/* 4-Step Program-Controlled Progress Bar (Cannot Skip Ahead!) */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full pb-3">
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
                        className={`relative flex items-center justify-center sm:justify-start gap-3 py-2.5 px-3 rounded-xl transition text-start ${
                          isActive
                            ? 'text-[#D4AE62] bg-white/[0.04]'
                            : isUploaded
                            ? 'text-emerald-400 hover:bg-white/[0.03] cursor-pointer'
                            : 'text-white/30 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                            isUploaded
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isActive
                              ? 'bg-[#D4AE62] text-black font-extrabold shadow-[0_0_16px_rgba(212,174,98,0.5)]'
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
                            {angle.title}
                          </span>
                          <span className="hidden sm:block text-[10px] text-white/40">
                            {isUploaded
                              ? 'Yuklandi'
                              : isActive
                              ? 'Navbatdagi majburiy'
                              : 'Kutilmoqda'}
                          </span>
                        </div>

                        {/* Active Gold Indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeAngleTabUnderline"
                            className="absolute -bottom-1 inset-x-3 h-0.5 bg-[#D4AE62] shadow-[0_0_8px_#D4AE62]"
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
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E5C175]">
                        <span>{currentStepIndex + 1}-Qadam (Majburiy)</span>
                      </span>
                      <h2 className="text-xl sm:text-2xl font-light text-foreground tracking-tight">
                        {currentAngle.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {currentAngle.guideInstruction}
                      </p>
                    </div>

                    {/* Non-clickable 4-Direction Car Compass */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mx-auto my-2">
                      <LuxuryCarCompass
                        activeAngleId={currentAngle.id}
                        completedAngles={uploadedAngleIds}
                        size="lg"
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

                    <div className="space-y-1 w-full">
                      <h2 className="text-xl sm:text-2xl font-light text-foreground tracking-tight">
                        {currentAnglePhoto
                          ? `${currentAngle.title} surati yuklandi`
                          : `${currentAngle.title} rasmini yuklang`}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {currentAnglePhoto
                          ? allAnglesUploaded
                            ? 'Barcha 4 ta majburiy rasm yuklandi! Endi davom etishingiz mumkin.'
                            : 'Keyingi majburiy rakursga o‘ting yoki rasmni yangilang.'
                          : 'Kompas ko‘rsatgan tomon suratini tanlang yoki shu yerga tashlang'}
                      </p>
                    </div>

                    {/* Borderless Interactive Upload Drop Target */}
                    <div className="w-full">
                      {currentAnglePhoto ? (
                        <div className="relative w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center select-none rounded-3xl bg-white/[0.02]">
                          <img
                            src={currentAnglePhoto}
                            alt={currentAngle.title}
                            className="max-h-[165px] w-auto max-w-full rounded-2xl object-contain shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
                          />

                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{currentAngle.title} saqlandi</span>
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
                              <span>Almashtirish</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className="relative w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center text-center cursor-pointer select-none transition group rounded-3xl bg-white/[0.02] hover:bg-white/[0.04]"
                        >
                          {/* Ambient glow on hover/drag */}
                          <div
                            className={`absolute inset-0 rounded-3xl transition-opacity pointer-events-none ${
                              isDragging
                                ? 'bg-[#D4AE62]/10 opacity-100 blur-2xl'
                                : 'opacity-0 group-hover:opacity-100 bg-[#D4AE62]/5 blur-3xl'
                            }`}
                          />

                          <div className="relative z-10 flex flex-col items-center space-y-3">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-[#D4AE62] group-hover:scale-105 group-hover:bg-[#D4AE62]/15 transition duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                              <Upload className="h-7 w-7 stroke-[1.6]" />
                            </div>

                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-foreground">
                                {currentAngle.title} suratini tanlash uchun bosing
                              </p>
                              <p className="text-xs text-muted-foreground">
                                JPG, PNG, HEIC yoki WebP formatlari
                              </p>
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-6 py-2.5 text-xs font-semibold text-black tracking-wide shadow-gold group-hover:brightness-110 active:scale-98 transition">
                              <ImageIcon className="h-4 w-4" />
                              <span>{currentAngle.shortTitle} rasmini tanlash</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mandatory All-Angles Status & Davom Etish Gate */}
                    <div className="w-full pt-2 space-y-3">
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="inline-flex items-center gap-1.5 text-white/60">
                          {allAnglesUploaded ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-medium">
                                Barcha 4 ta majburiy rasm tayyor
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5 text-[#D4AE62]" />
                              <span>
                                Majburiy: barcha 4 ta rasm yuklanmaguncha davom etib bo‘lmaydi
                              </span>
                            </>
                          )}
                        </span>
                        <span className="font-semibold text-[#D4AE62]">
                          {uploadedCount} / {REQUIRED_ANGLE_COUNT}
                        </span>
                      </div>

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
                          <span>Oldingi</span>
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
                              <span>Keyingi rakurs</span>
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
                              Davom etish ({uploadedCount}/{REQUIRED_ANGLE_COUNT})
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
              <div className="h-14 w-14 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin mb-4" />
              <p className="text-xs font-medium text-muted-foreground">
                4K Studio tayyorlanmoqda...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
