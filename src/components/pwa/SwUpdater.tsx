'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

const CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Keeps an installed app from running old code. The service worker is checked for a new version
 * whenever the app comes back to the foreground (and every 30 minutes while it stays open). When a
 * new version takes over, a small card offers to reload; nothing reloads by itself, so a half-filled
 * form or a payment receipt is never lost.
 */
export function SwUpdater() {
  const t = useTranslations('pwaUpdate');
  const [ready, setReady] = React.useState(false);

  // Opening the app clears the red dot a notification put on its icon.
  React.useEffect(() => {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    const clear = () => {
      if (document.visibilityState === 'visible') void nav.clearAppBadge?.().catch(() => {});
    };
    clear();
    document.addEventListener('visibilitychange', clear);
    return () => document.removeEventListener('visibilitychange', clear);
  }, []);

  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    // A first install also fires `controllerchange`; only a change from an older controller is an update.
    let hadController = Boolean(sw.controller);
    const onChange = () => {
      if (hadController) setReady(true);
      hadController = true;
    };
    sw.addEventListener('controllerchange', onChange);

    let lastCheck = Date.now();
    const check = () => {
      lastCheck = Date.now();
      void sw.getRegistration().then((r) => r?.update()).catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60_000) check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      sw.removeEventListener('controllerchange', onChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, []);

  if (!ready) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-no-haptic
      className="fixed inset-x-4 z-[90] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#161616]/95 p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl bottom-[calc(env(safe-area-inset-bottom)+88px)]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold leading-tight text-white">{t('title')}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">{t('body')}</p>
      </div>
      <button type="button" onClick={() => setReady(false)} className="shrink-0 rounded-full px-3 py-2 text-[13px] font-medium text-white/60 active:bg-white/10">
        {t('later')}
      </button>
      <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-full bg-[#FDC902] px-4 py-2 text-[13px] font-semibold text-black active:scale-95">
        {t('reload')}
      </button>
    </div>
  );
}
