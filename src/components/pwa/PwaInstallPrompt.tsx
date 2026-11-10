'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, Copy, Download, EllipsisVertical, PlusSquare, Share, X } from 'lucide-react';
import { Modal, buttonClasses } from '@/components/ui';
import { OPEN_INSTALL_EVENT, detectInstallPlatform, isStandalone, startInstall, type InstallPlatform } from './install';

const DISMISS_KEY = 'cv_pwa_dismissed_until';
const DISMISS_DAYS = 7;

function readDismissed(): boolean {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** Live install platform; changes when the browser reports the app installable or installed. */
export function useInstallPlatform(): InstallPlatform | null {
  const [platform, setPlatform] = React.useState<InstallPlatform | null>(null);
  React.useEffect(() => {
    const update = () => setPlatform(detectInstallPlatform());
    update();
    window.addEventListener('cv:installable', update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener('cv:installable', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);
  return platform;
}

/** One numbered step: icon tile + short text. */
function Step({ n, icon: Icon, children }: { n: number; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3.5">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-white">
        <Icon className="h-6 w-6" />
        <span className="absolute -start-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-[11px] font-bold text-black">
          {n}
        </span>
      </span>
      <span className="text-[15px] leading-snug text-white/90">{children}</span>
    </li>
  );
}

/** Platform-specific guide for browsers that cannot install with one tap. */
function InstallGuide({ platform, onClose }: { platform: InstallPlatform; onClose: () => void }) {
  const t = useTranslations('install');
  const reduce = useReducedMotion();
  const [copied, setCopied] = React.useState(false);
  const b = (chunks: React.ReactNode) => <b className="font-semibold text-white">{chunks}</b>;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the steps still say what to do */
    }
  };

  // iPhone Safari keeps Share in the bottom bar; other iOS browsers in the address bar at the top.
  const arrow = platform === 'ios-safari' ? 'down' : platform === 'ios-other' ? 'up' : null;

  return (
    <>
      <div className="flex flex-col items-center text-center">
        <img src="/icons/icon-192.png?v=3" alt="" width={64} height={64} className="h-16 w-16 rounded-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
        <p className="mt-3 text-sm text-white/55">{t('guideSub')}</p>
      </div>

      <ol className="mt-6 space-y-4">
        {platform === 'ios-safari' && (
          <>
            <Step n={1} icon={Share}>
              {t.rich('iosSafariStep1', { b })}
            </Step>
            <Step n={2} icon={PlusSquare}>
              {t.rich('iosStep2', { b })}
            </Step>
          </>
        )}
        {platform === 'ios-other' && (
          <>
            <Step n={1} icon={Share}>
              {t.rich('iosOtherStep1', { b })}
            </Step>
            <Step n={2} icon={PlusSquare}>
              {t.rich('iosStep2', { b })}
            </Step>
          </>
        )}
        {platform === 'in-app' && (
          <>
            <Step n={1} icon={EllipsisVertical}>
              {t.rich('inAppStep1', { b })}
            </Step>
            <Step n={2} icon={Download}>
              {t.rich('inAppStep2', { b })}
            </Step>
          </>
        )}
        {platform === 'android-manual' && (
          <>
            <Step n={1} icon={EllipsisVertical}>
              {t.rich('androidStep1', { b })}
            </Step>
            <Step n={2} icon={Download}>
              {t.rich('androidStep2', { b })}
            </Step>
          </>
        )}
        {platform === 'desktop-manual' && (
          <Step n={1} icon={Download}>
            {t.rich('desktopStep', { b })}
          </Step>
        )}
      </ol>

      {platform === 'in-app' ? (
        <button
          type="button"
          onClick={() => void copyLink()}
          className={buttonClasses({
            size: 'lg',
            fullWidth: true,
            className: 'mt-7',
          })}
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? t('copied') : t('copyLink')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className={buttonClasses({
            size: 'lg',
            fullWidth: true,
            className: 'mt-7',
          })}
        >
          {t('gotIt')}
        </button>
      )}

      {/* Points at where the Share button lives, outside the dialog. */}
      {arrow &&
        createPortal(
          <motion.span
            aria-hidden
            className={`pointer-events-none fixed z-[201] grid h-12 w-12 place-items-center rounded-full bg-gold-500 text-black shadow-[0_0_30px_rgba(232,191,116,0.6)] ${
              arrow === 'down' ? 'bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2' : 'end-3 top-3'
            }`}
            animate={reduce ? { y: 0 } : { y: arrow === 'down' ? [0, 8, 0] : [0, -8, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            {arrow === 'down' ? <ArrowDown className="h-6 w-6" /> : <ArrowUp className="h-6 w-6" />}
          </motion.span>,
          document.body,
        )}
    </>
  );
}

/**
 * App install UI, mounted once in the locale layout:
 * - a small banner offered automatically while the app is installable (dismissible for a week);
 * - the step-by-step guide, opened by any "Install the app" button through `startInstall()`
 *   when the browser cannot install with one tap.
 */
export function PwaInstallPrompt() {
  const t = useTranslations('install');
  const platform = useInstallPlatform();
  const pathname = usePathname() ?? '';
  // A part's page, the cart, checkout and the build screen have their own bar at the bottom
  // (Add to cart, Checkout, Apply): the banner must never sit on top of it.
  const hasOwnBottomBar = /^\/[a-z]{2}\/(shop\/[^/]+|cart|customize)(\/|$)/.test(pathname);
  const [bannerOpen, setBannerOpen] = React.useState(false);
  const [guideFor, setGuideFor] = React.useState<InstallPlatform | null>(null);

  React.useEffect(() => {
    if (isStandalone() || readDismissed()) return;
    // Give the page a moment before offering anything.
    const id = window.setTimeout(() => setBannerOpen(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  React.useEffect(() => {
    const open = () => {
      const p = detectInstallPlatform();
      if (p === 'installed' || p === 'prompt') return;
      setBannerOpen(false);
      setGuideFor(p);
    };
    const installed = () => {
      setBannerOpen(false);
      setGuideFor(null);
    };
    window.addEventListener(OPEN_INSTALL_EVENT, open);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener(OPEN_INSTALL_EVENT, open);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const dismiss = () => {
    setBannerOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // storage unavailable: it simply reappears next visit
    }
  };

  // The banner is only offered where installing is possible from here (one tap, or the iOS guide).
  const offerBanner = bannerOpen && !hasOwnBottomBar && (platform === 'prompt' || platform === 'ios-safari' || platform === 'ios-other');

  return (
    <>
      <AnimatePresence>
        {offerBanner && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-[calc(var(--dock-h,0px)+16px)] z-50 flex items-center gap-3 rounded-3xl bg-surface-1/95 p-3 pe-2 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85),0_0_35px_rgba(232,191,116,0.1)] backdrop-blur-2xl sm:inset-x-auto sm:end-6 sm:w-[400px]"
          >
            <img src="/icons/icon-192.png?v=3" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{t('bannerTitle')}</p>
              <p className="truncate text-xs text-white/55">{t('bannerText')}</p>
            </div>
            <button
              type="button"
              onClick={() => void startInstall()}
              className={buttonClasses({
                size: 'sm',
                className: 'shrink-0 px-4',
              })}
            >
              {t('install')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('close')}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={guideFor !== null} onClose={() => setGuideFor(null)} title={t('guideTitle')} size="sm">
        {guideFor && <InstallGuide platform={guideFor} onClose={() => setGuideFor(null)} />}
      </Modal>
    </>
  );
}

/** The install call-to-action used on the landing page. Hidden inside the installed app. */
export function InstallAppButton({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations('install');
  const platform = useInstallPlatform();
  if (platform === 'installed') return null;
  return (
    <button type="button" onClick={() => void startInstall()} className={className ?? buttonClasses({ size: 'lg' })}>
      <Download className="h-5 w-5" />
      {label ?? t('cta')}
    </button>
  );
}
