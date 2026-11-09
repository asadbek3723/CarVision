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
    // Guarantees at least 1.0 full second (1000ms) splash screen regardless of connection speed
    // This allows fonts, high-res car assets, and hydration to settle smoothly without any UI freeze
    const id = window.setTimeout(() => {
      setPhase('fade');
    }, 1000);
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
