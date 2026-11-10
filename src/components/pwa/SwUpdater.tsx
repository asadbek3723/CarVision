'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const CHECK_EVERY_MS = 30 * 60 * 1000;
const LAST_RELOAD_KEY = 'cv_sw_reloaded_at';
/** A page opened this recently has nothing in it worth keeping: it may reload the moment an update lands. */
const FRESH_PAGE_MS = 15_000;

/** True when reloading now would lose nothing the person is doing (typing, a receipt, an open dialog). */
function safeToReload(): boolean {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
  if (document.querySelector('[role="dialog"]')) return false;
  if (/\/(checkout|customize|new-part)(\/|$)/.test(window.location.pathname)) return false;
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])');
  for (const el of fields) if (el.value && el.offsetParent !== null) return false;
  return true;
}

function reloadOnce(): boolean {
  try {
    // Never twice in a row: a broken update must not trap the app in a reload loop.
    if (Date.now() - Number(sessionStorage.getItem(LAST_RELOAD_KEY) ?? 0) < 30_000) return false;
    sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked: reload anyway, the page-age rule still limits it */
  }
  window.location.reload();
  return true;
}

/**
 * Keeps an installed app from running old code, without asking anyone. The service worker is checked
 * for a new version whenever the app comes back to the foreground (and every 30 minutes). When a new
 * version takes over, the app reloads by itself at a moment that costs nothing: right at launch, when
 * the person returns to the app, or at their next screen change. If they are in the middle of
 * something (typing, a dialog, checkout) it waits, and only then shows a small "Update" card.
 */
export function SwUpdater() {
  const t = useTranslations('pwaUpdate');
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const pending = React.useRef(false);

  // The person moved to another screen while an update waits: reload into the new version now.
  React.useEffect(() => {
    if (pending.current && safeToReload()) reloadOnce();
  }, [pathname]);

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
      if (hadController) {
        pending.current = true;
        // Opened a moment ago: nothing to lose, update at once. Otherwise wait for a quiet moment.
        if (performance.now() < FRESH_PAGE_MS && safeToReload() && reloadOnce()) return;
        setReady(true);
      }
      hadController = true;
    };
    sw.addEventListener('controllerchange', onChange);

    let lastCheck = Date.now();
    const check = () => {
      lastCheck = Date.now();
      void sw.getRegistration().then((r) => r?.update()).catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Back in the app with an update waiting: take it now, before anything is touched.
      if (pending.current && safeToReload() && reloadOnce()) return;
      if (Date.now() - lastCheck > 60_000) check();
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
