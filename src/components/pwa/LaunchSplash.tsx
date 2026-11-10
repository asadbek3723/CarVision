'use client';

import * as React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { APP_BACKGROUND } from '@/lib/pwa-theme';

/** The mark stays at least this long, counted from the start of page load (not from hydration). */
const MIN_MS = 2000;
/** On a slow connection it waits for the fonts, but never longer than this. */
const MAX_MS = 3200;
/** Fade-out length (globals.css `.cv-splash[data-state='out']`). */
const FADE_MS = 500;
/** Coming back to the app after this long away (it was parked in the background) shows the mark again. */
const RESUME_AFTER_MS = 10 * 60 * 1000;

const until = (ms: number) => new Promise<void>((r) => window.setTimeout(r, Math.max(0, ms - performance.now())));
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Launch screen: the big CARVISION mark on the app's dark background, shown whenever the app or a
 * link to it is opened (a full page load; moving between screens never shows it again). It is part
 * of the server HTML, so it is on screen from the first paint and carries on from the phone's own
 * launch screen. It always holds for two seconds, even on a fast connection, and that time is put to
 * use: the main screens are prefetched and the fonts finish loading behind it, so the first taps
 * after it are instant. Then it fades away. It also returns for two seconds when the app is opened
 * again after ten minutes or more in the background, the way a native app restarts.
 */
export function LaunchSplash() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const [state, setState] = React.useState<'in' | 'out' | 'gone'>('in');
  const skip = /^\/[a-z]{2}\/admin(\/|$)/.test(pathname);

  // Back from a long stay in the background: play the launch screen again.
  const [run, setRun] = React.useState(0);
  React.useEffect(() => {
    if (skip) return;
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= RESUME_AFTER_MS) {
        hiddenAt = 0;
        setState('in');
        setRun((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [skip]);

  React.useEffect(() => {
    if (skip || run === 0) return;
    let alive = true;
    void wait(MIN_MS).then(() => {
      if (!alive) return;
      setState('out');
      window.setTimeout(() => alive && setState('gone'), FADE_MS + 40);
    });
    return () => {
      alive = false;
    };
  }, [run, skip]);

  React.useEffect(() => {
    if (skip) return;
    let alive = true;
    // Warm the screens people open first.
    for (const path of ['seller', 'shop', 'cart', 'profile']) {
      try {
        router.prefetch(`/${locale}/${path}`);
      } catch {
        /* prefetch is best-effort */
      }
    }
    // Not the window `load` event: that waits for every photo on the page, which on a slow
    // connection would keep the mark up for seconds. Fonts are what would visibly jump.
    const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
    void Promise.all([until(MIN_MS), Promise.race([fonts, until(MAX_MS)])]).then(() => {
      if (!alive) return;
      setState('out');
      window.setTimeout(() => alive && setState('gone'), FADE_MS + 40);
    });
    return () => {
      alive = false;
    };
    // Once per page load: later navigations must not bring it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (skip || state === 'gone') return null;

  return (
    <div key={run} className="cv-splash" data-state={state} aria-hidden style={{ background: APP_BACKGROUND }}>
      <div className="cv-splash-mark flex flex-col items-center">
        <Wordmark size="lg" className="[&>span:first-child]:text-[34px] min-[400px]:[&>span:first-child]:text-[38px]" />
        <span className="mt-8 block h-px w-28 overflow-hidden rounded-full bg-white/[0.06]">
          <span className="cv-splash-line block h-full w-full bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
        </span>
      </div>
    </div>
  );
}
