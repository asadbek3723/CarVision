'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { buttonClasses } from '@/components/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaCopy {
  eyebrow: string;
  title: string;
  desc: string;
  iosDesc: string;
  installBtn: string;
  iosStep1: string;
  iosStep2: string;
}

const DEFAULT_COPY: PwaCopy = {
  eyebrow: 'TEZKOR ILOVA',
  title: "CarVision Ilovasini O'rnatish",
  desc: "Tezkor 4K kamera va to'liq ekranli avto-studiya uchun asosiy ekranga qo'shing.",
  iosDesc: "Tezkor kamera va to'liq ekranli studiya uchun asosiy ekranga qo'shing.",
  installBtn: "ASOSIY EKRANGA O'RNATISH",
  iosStep1: 'Brauzerning "Ulashish" (Share) belgisini bosing',
  iosStep2: '"Asosiy ekranga qo\'shish" bandini tanlang',
};

const LOCALIZED_COPY: Record<string, PwaCopy> = {
  uz: DEFAULT_COPY,
  ru: {
    eyebrow: 'ПРИЛОЖЕНИЕ PWA',
    title: 'Установить CarVision',
    desc: 'Добавьте на домашний экран для мгновенной 4K камеры и полноэкранной студии.',
    iosDesc: 'Установите для быстрого доступа к полноэкранной 4K авто-студии.',
    installBtn: 'ДОБАВИТЬ НА ЭКРАН',
    iosStep1: 'Нажмите иконку «Поделиться» в браузере',
    iosStep2: 'Выберите «На экран Домой»',
  },
  en: {
    eyebrow: 'WEB APPLICATION',
    title: 'Install CarVision App',
    desc: 'Add to your home screen for low-latency 4K camera scan and full-screen studio.',
    iosDesc: 'Install for high-speed camera access and full-screen atelier workflow.',
    installBtn: 'INSTALL TO HOME SCREEN',
    iosStep1: 'Tap the Share icon in your browser',
    iosStep2: 'Select "Add to Home Screen"',
  },
};

declare global {
  interface Window {
    /** Captured by the inline script in the locale layout, before React hydrates. */
    __cvDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

const DISMISS_KEY = 'cv_pwa_dismissed_until';
const DISMISS_DAYS = 7;

function readDismissed(): boolean {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function detectIos(): boolean {
  const ua = window.navigator.userAgent;
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1; // iPadOS 13+ pretends to be a Mac
  return (/iphone|ipad|ipod/i.test(ua) || iPadOs) && !('MSStream' in window);
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    ('standalone' in window.navigator && Boolean((window.navigator as unknown as { standalone: boolean }).standalone))
  );
}

/** True when the browser can show a real install flow (native prompt, or iOS "Add to Home Screen"). */
export function useCanInstall(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const update = () => setCan(!detectStandalone() && (detectIos() || Boolean(window.__cvDeferredPrompt)));
    update();
    window.addEventListener('cv:installable', update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener('cv:installable', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);
  return can;
}

/** Always-available "Install app" button (e.g. in the profile) for users who closed the banner. */
export function InstallAppButton({ className = '', label }: { className?: string; label?: string }) {
  const can = useCanInstall();
  if (!can) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('cv:open-install'))}
      className={className || 'flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3.5 text-start text-sm font-semibold text-white hover:bg-white/[0.07]'}
    >
      <Download className="h-5 w-5 text-gold-500" />
      {label ?? 'Ilovani o‘rnatish'}
    </button>
  );
}

export const PwaInstallPrompt: React.FC = () => {
  const params = useParams();
  const rawLocale = (params?.locale as string) || 'uz';
  const copy: PwaCopy = LOCALIZED_COPY[rawLocale] ?? DEFAULT_COPY;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (detectStandalone()) {
      setIsStandalone(true);
      return;
    }

    const ios = detectIos();
    setIsIos(ios);
    const wasDismissed = readDismissed();

    // The browser fires `beforeinstallprompt` once, often before React hydrates: pick up the copy
    // the layout script stored, then keep listening for later ones.
    const adopt = () => {
      if (window.__cvDeferredPrompt) {
        setDeferredPrompt(window.__cvDeferredPrompt);
        if (!readDismissed()) setDismissed(false);
      }
    };
    const open = () => {
      adopt();
      setDismissed(false);
    };
    const installed = () => {
      window.__cvDeferredPrompt = null;
      setDeferredPrompt(null);
      setDismissed(true);
      setIsStandalone(true);
    };

    if (ios && !wasDismissed) setDismissed(false);
    adopt();
    window.addEventListener('cv:installable', adopt);
    window.addEventListener('cv:open-install', open);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('cv:installable', adopt);
      window.removeEventListener('cv:open-install', open);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt ?? window.__cvDeferredPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    // A prompt can only be used once; the browser fires a fresh event if it is still installable.
    window.__cvDeferredPrompt = null;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // storage unavailable: it simply reappears next visit
    }
  };

  // Nothing to offer: not iOS and the browser has not said the app is installable.
  if (!isIos && !deferredPrompt) return null;
  if (isStandalone || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 35, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 25, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-5 start-4 end-4 sm:start-auto sm:end-6 sm:w-[420px] z-50 bg-surface-1/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85),0_0_35px_rgba(212,174,98,0.1)] text-white"
      >
        <div className="flex items-start justify-between gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-500/20 via-gold-500/10 to-transparent flex items-center justify-center shrink-0 text-gold-300 shadow-[0_4px_16px_rgba(212,174,98,0.15)]">
            <Download className="w-5 h-5 stroke-[2]" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">
              {copy.eyebrow}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
              {copy.title}
            </h4>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {isIos ? copy.iosDesc : copy.desc}
            </p>

            {isIos ? (
              <div className="mt-4 bg-surface-1/90 rounded-2xl p-3 space-y-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-gold-500/20 text-gold-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                    1
                  </span>
                  <span>{copy.iosStep1}</span>
                  <Share2 className="w-3.5 h-3.5 text-gold-300 ms-auto shrink-0" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-gold-500/20 text-gold-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                    2
                  </span>
                  <span>{copy.iosStep2}</span>
                  <PlusSquare className="w-3.5 h-3.5 text-neutral-400 ms-auto shrink-0" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className={buttonClasses({ size: 'md', fullWidth: true, className: 'mt-4' })}
              >
                <Download className="w-4 h-4 stroke-[2.2]" />
                <span>{copy.installBtn}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 -me-1 -mt-1 cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

