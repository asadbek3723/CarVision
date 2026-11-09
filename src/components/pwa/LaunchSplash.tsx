'use client';

import * as React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';

/** The mark stays at least this long, counted from the start of page load (not from hydration). */
const MIN_MS = 1000;
/** On a slow connection it waits for the fonts, but never longer than this. */
const MAX_MS = 1800;
/** Fade-out length (globals.css `.cv-splash[data-state='out']`). */
const FADE_MS = 620;

const until = (ms: number) => new Promise<void>((r) => window.setTimeout(r, Math.max(0, ms - performance.now())));

/**
 * Launch screen: the big CARVISION mark on the app's dark background, shown whenever the app or a
 * link to it is opened (a full page load; moving between screens never shows it again). It is part
 * of the server HTML, so it is on screen from the first paint and carries on from the phone's own
 * launch screen. It holds for about a second even on a fast connection, and that second is put to
 * use: the main screens are prefetched and the fonts finish loading behind it, so the first taps
 * after it are instant. Then it fades away.
 */
export function LaunchSplash() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const [state, setState] = React.useState<'in' | 'out' | 'gone'>('in');
  const skip = /^\/[a-z]{2}\/admin(\/|$)/.test(pathname);

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
    <div className="cv-splash" data-state={state} aria-hidden style={{ background: '#07080B' }}>
      <div className="cv-splash-mark flex flex-col items-center">
        <Wordmark size="lg" className="[&>span:first-child]:text-[34px] min-[400px]:[&>span:first-child]:text-[38px]" />
        <span className="mt-8 block h-px w-28 overflow-hidden rounded-full bg-white/[0.06]">
          <span className="cv-splash-line block h-full w-full bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
        </span>
      </div>
    </div>
  );
}
