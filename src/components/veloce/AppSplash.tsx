'use client';

import * as React from 'react';
import { Wordmark } from '@/components/ui/Wordmark';

const SEEN_KEY = 'cv_splash_seen';
const MIN_MS = 1000;
const FADE_MS = 450;

/**
 * Launch screen: only the CarVision wordmark, large and centred, on the app background.
 * It is part of the server HTML, so it is the very first thing on screen while the app loads, and
 * stays at least a second on a fresh launch before fading into the app. Later reloads in the same
 * session just cover the load. Tab changes never show it (the shell stays mounted).
 */
export function AppSplash() {
  const [phase, setPhase] = React.useState<'show' | 'fade' | 'gone'>('show');

  React.useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* storage blocked: show the full launch screen */
    }
    // performance.now() counts from the start of the page load.
    const wait = seen ? 0 : Math.max(0, MIN_MS - performance.now());
    const id = window.setTimeout(() => {
      setPhase('fade');
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* ignore */
      }
    }, wait);
    return () => window.clearTimeout(id);
  }, []);

  React.useEffect(() => {
    if (phase !== 'fade') return;
    const id = window.setTimeout(() => setPhase('gone'), FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === 'gone') return null;
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[300] grid place-items-center bg-surface-0 transition-opacity ease-out ${phase === 'fade' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <Wordmark size="xl" />
    </div>
  );
}
