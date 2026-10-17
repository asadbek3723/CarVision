'use client';

import * as React from 'react';
import {
  X,
  QrCode,
  Upload,
  Copy,
  Check,
  Camera,
  Sparkles,
  Smartphone,
  ChevronRight,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import { SmartCameraLandscapeView, SCAN_5_ANGLES } from '@/features/camera/components/SmartCameraLandscapeView';
import type { CompressResult } from '@/features/camera/lib/image-compressor';
import { useParams } from 'next/navigation';

interface VeloceSmartCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured: (dataUrl: string) => void;
}

export function VeloceSmartCameraModal({
  isOpen,
  onClose,
  onCaptured,
}: VeloceSmartCameraModalProps) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const [mode, setMode] = React.useState<'desktop-handoff' | 'live-camera'>('desktop-handoff');
  const [sessionId, setSessionId] = React.useState<string>('');
  const [sessionStatus, setSessionStatus] = React.useState<'waiting' | 'connected' | 'captured'>('waiting');
  const [copied, setCopied] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Detect mobile vs desktop screen on mount or resize
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setMode('live-camera');
      } else {
        setMode('desktop-handoff');
      }
    }
  }, [isOpen]);

  // Create a new hand-off session when modal opens on desktop
  React.useEffect(() => {
    if (!isOpen || mode !== 'desktop-handoff') return;

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
  }, [isOpen, mode]);

  // Poll session status on desktop
  React.useEffect(() => {
    if (!isOpen || !sessionId || mode !== 'desktop-handoff') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/camera-session/${sessionId}`);
        const data = await res.json();
        if (data.success && data.session) {
          setSessionStatus(data.session.status);
          if (data.session.status === 'captured' && data.session.imageUrl) {
            clearInterval(interval);
            setIsProcessing(true);
            setTimeout(() => {
              setIsProcessing(false);
              onCaptured(data.session.imageUrl);
            }, 600);
          }
        }
      } catch {
        // Polling retry
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isOpen, sessionId, mode, onCaptured]);

  if (!isOpen) return null;

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

  const handlePhotoCaptured = (result: CompressResult, _angleId: number) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        try {
          sessionStorage.setItem('carvision_captured_image', dataUrl);
          sessionStorage.setItem('veloce_photo', dataUrl);
          sessionStorage.setItem('carvision_captured_at', Date.now().toString());
        } catch {
          // Storage quota
        }
      }
      setTimeout(() => {
        setIsProcessing(false);
        onCaptured(dataUrl);
      }, 700);
    };
    reader.readAsDataURL(result.blob);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, angleId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        setUploadedFiles((prev) => ({ ...prev, [angleId]: dataUrl }));
        // If angle 2 (Front-Right 3/4) or primary angle uploaded, ready to advance
        if (angleId === 2 || Object.keys(uploadedFiles).length >= 1) {
          setIsProcessing(true);
          try {
            sessionStorage.setItem('carvision_captured_image', dataUrl);
            sessionStorage.setItem('veloce_photo', dataUrl);
            sessionStorage.setItem('carvision_captured_at', Date.now().toString());
          } catch {
            // Storage quota
          }
          setTimeout(() => {
            setIsProcessing(false);
            onCaptured(dataUrl);
          }, 600);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDemoCarSelect = (url: string = '/assets/car-CjioCIbt.jpg') => {
    setIsProcessing(true);
    try {
      sessionStorage.setItem('carvision_captured_image', url);
      sessionStorage.setItem('veloce_photo', url);
      sessionStorage.setItem('carvision_captured_at', Date.now().toString());
    } catch {
      // Storage error
    }
    setTimeout(() => {
      setIsProcessing(false);
      onCaptured(url);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* MODE 1: LIVE 1:1 LANDSCAPE SMART CAMERA (Zero iOS bar, 6 angles, floor perspective) */}
      {mode === 'live-camera' && (
        <div className="relative w-full h-full flex flex-col bg-black">
          <SmartCameraLandscapeView
            onPhotoCaptured={handlePhotoCaptured}
            onClose={onClose}
            className="w-full h-full"
          />

          {/* Processing / Transfer Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#07080B]/95 backdrop-blur-2xl">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-[#D4AE62] animate-pulse" />
                </div>
              </div>
              <h3 className="font-display text-sm font-bold tracking-[0.2em] text-[#EDE8DF] uppercase">
                AVTOMOBIL ANIQLANDI // 4K SCAN TAYYOR
              </h3>
              <p className="mt-2 text-xs font-mono text-[#D4AE62] tracking-wider">
                Studio visualizerga o‘tkazilmoqda...
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: DESKTOP DUAL OPTION (QR Code Mobile Hand-off + 6-Angle File Upload) */}
      {mode === 'desktop-handoff' && (
        <div className="relative min-h-screen w-full flex flex-col bg-[#07080B] p-6 sm:p-10 md:p-12 overflow-y-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-8 border-b border-[#D4AE62]/15">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h1 className="font-display text-lg sm:text-xl font-light tracking-[0.3em] text-foreground uppercase">
                  SMART CAMERA // 4K SCAN
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avtomobil fotosuratlari orqali 3D studio modelini yaratish
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 2-Option Luxury Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-auto py-8 max-w-6xl mx-auto w-full">
            {/* OPTION 1: QR CODE MOBILE HAND-OFF */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#14161F] to-[#0E1017] p-8 border border-[#D4AE62]/20 shadow-card flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-black">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-medium tracking-wider text-foreground uppercase">
                        1-Variant: QR Kod bilan Skan
                      </h2>
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                        Tavsiya etiladi (100% 4K Sifat)
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary border border-primary/20">
                    <Smartphone className="h-3 w-3" />
                    Telefon
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Telefon kamerangiz orqali quyidagi QR kodni skaner qiling. Telefondan kadr olinishi bilan surat avtomatik ushbu kompyuterga uzatiladi.
                </p>

                {/* QR Code Container */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                  <div className="relative p-3 rounded-2xl bg-white shadow-gold border-2 border-[#D4AE62]">
                    {sessionUrl ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          sessionUrl
                        )}`}
                        alt="Scan with phone"
                        width={180}
                        height={180}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="h-[180px] w-[180px] grid place-items-center bg-neutral-100 rounded-lg">
                        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Status & Copy Link */}
                  <div className="flex-1 space-y-4 text-center sm:text-start">
                    <div className="rounded-2xl bg-[#090A0E] p-4 border border-[#D4AE62]/10 space-y-2">
                      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Aloqa Holati:
                      </div>
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span
                          className={`h-2.5 w-2.5 rounded-full animate-pulse ${
                            sessionStatus === 'captured'
                              ? 'bg-emerald-400'
                              : sessionStatus === 'connected'
                              ? 'bg-primary'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="text-xs font-mono font-medium text-foreground">
                          {sessionStatus === 'captured'
                            ? 'Kadr qabul qilindi!'
                            : sessionStatus === 'connected'
                            ? 'Telefon ulandi // Surat kutilmoqda'
                            : 'Telefon ulanishi kutilmoqda...'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-white transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>Nusxalandi!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Havolani nusxalash</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#D4AE62]/10 flex items-center justify-between text-xs text-muted-foreground">
                <span>Avtomatik sinxronizatsiya: Faol</span>
                <span className="text-primary font-mono">ID: {sessionId.slice(0, 10)}</span>
              </div>
            </div>

            {/* OPTION 2: DIRECT 6-ANGLE FILE UPLOAD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#14161F] to-[#0E1017] p-8 border border-[#D4AE62]/20 shadow-card flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-medium tracking-wider text-foreground uppercase">
                        2-Variant: Fayl Yuklash
                      </h2>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        5 ta burchak bo‘yicha
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white">
                    <Monitor className="h-3 w-3" />
                    Kompyuter
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kompyuteringizdagi tayyor mashina fotosuratlarini yuklang. Kamida 1 ta burchak (Oldi-chap 3/4) yetarli.
                </p>

                {/* 5 Angle Slots Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-2">
                  {SCAN_5_ANGLES.map((angle) => {
                    const isUploaded = Boolean(uploadedFiles[angle.id]);
                    return (
                      <label
                        key={angle.id}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer min-h-[88px] ${
                          isUploaded
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-[#D4AE62]/20 bg-[#090A0E] hover:border-primary text-muted-foreground hover:text-white'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, angle.id)}
                        />
                        {isUploaded ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-primary mb-1" />
                            <span className="text-[10px] font-bold tracking-wider">{angle.label}</span>
                            <span className="text-[9px] text-primary truncate max-w-[80px]">Yuklandi</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mb-1 text-[#D4AE62]/70" />
                            <span className="text-[10px] font-medium text-white">{angle.label}</span>
                            <span className="text-[8px] text-muted-foreground truncate max-w-[80px]">
                              {angle.name.split(' ')[0]}
                            </span>
                          </>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Quick Demo Test Action */}
              <div className="mt-6 pt-4 border-t border-[#D4AE62]/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoCarSelect('/assets/car-CjioCIbt.jpg')}
                  className="flex items-center gap-2 rounded-xl bg-gold-gradient px-4 py-2 text-xs font-semibold text-black tracking-wider uppercase transition hover:brightness-110 shadow-gold cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Demo 4K Kadr Bilan O‘tish</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('live-camera')}
                  className="flex items-center gap-1.5 text-xs text-[#D4AE62] hover:underline cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Veb-kameradan foydalanish &gt;</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Direct WebCam Prompt */}
          <div className="text-center pt-4">
            <button
              onClick={() => setMode('live-camera')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition uppercase tracking-widest cursor-pointer"
            >
              <span>Ushbu kompyuter veb-kamerasini to‘liq 1:1 ekranda ochish</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Processing / Transfer Overlay */}
          {isProcessing && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080B]/95 backdrop-blur-2xl">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-[#D4AE62] animate-pulse" />
                </div>
              </div>
              <h3 className="font-display text-sm font-bold tracking-[0.2em] text-[#EDE8DF] uppercase">
                AVTOMOBIL ANIQLANDI // 4K SCAN TAYYOR
              </h3>
              <p className="mt-2 text-xs font-mono text-[#D4AE62] tracking-wider">
                Studio visualizerga o‘tkazilmoqda...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
