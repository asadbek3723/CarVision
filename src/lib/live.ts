'use client';

import * as React from 'react';

/**
 * Keeps screens fresh without reloading them, and without anyone pulling to refresh.
 *
 * The tab pager keeps every tab mounted (so swiping back is instant and keeps its scroll), which
 * means a tab's first fetch alone would go stale. `useLiveTick()` returns a counter that goes up
 * whenever the data should be re-read silently:
 *  - the shop's content changed on the server (a part was published / edited / removed, the banner
 *    changed): a single shared poller asks `/api/v1/live` every few seconds while the app is on
 *    screen and every active screen re-reads at once when the answer changes,
 *  - the tab becomes the visible one again,
 *  - the app comes back to the foreground / regains focus / the network returns,
 *  - every `intervalMs` while the tab is visible (safety net if the signal is unavailable).
 * Screens add the counter to their fetch effects; first loads show skeletons, later ones do not.
 */

/** True while this screen is the one on display (always true outside the tab pager). */
export const TabActiveContext = React.createContext(true);

export function useTabActive(): boolean {
  return React.useContext(TabActiveContext);
}

const MIN_GAP_MS = 4000;
const SIGNAL_EVERY_MS = 5000;

// ---------------------------------------------------------------------------
// One shared poller for the whole app (not one per screen).
// ---------------------------------------------------------------------------
let version = '';
const listeners = new Set<() => void>();
let timer: number | null = null;
let polling = false;
let lastPoll = 0;

/** The latest known content token; add it to list requests so a CDN copy can never be stale. */
export function liveVersion(): string {
  return version;
}

async function pollOnce(): Promise<void> {
  if (polling || document.visibilityState !== 'visible' || navigator.onLine === false) return;
  // Focus + visibility + online often fire together: one question is enough.
  if (Date.now() - lastPoll < 2000) return;
  lastPoll = Date.now();
  polling = true;
  try {
    const res = await fetch('/api/v1/live', { cache: 'no-store' });
    const data = (await res.json()) as { success?: boolean; v?: string };
    if (data.success && data.v && data.v !== version) {
      const first = version === '';
      version = data.v;
      if (!first) listeners.forEach((fn) => fn());
    }
  } catch {
    /* offline or a server blip: the next tick tries again */
  } finally {
    polling = false;
  }
}

function startPolling(): void {
  if (timer !== null || typeof window === 'undefined') return;
  void pollOnce();
  timer = window.setInterval(() => void pollOnce(), SIGNAL_EVERY_MS);
  document.addEventListener('visibilitychange', onWake);
  window.addEventListener('focus', onWake);
  window.addEventListener('online', onWake);
}

function stopPolling(): void {
  if (timer === null) return;
  window.clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onWake);
  window.removeEventListener('focus', onWake);
  window.removeEventListener('online', onWake);
}

function onWake(): void {
  if (document.visibilityState === 'visible') void pollOnce();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  startPolling();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stopPolling();
  };
}

export function useLiveTick(intervalMs = 30_000): number {
  const active = useTabActive();
  const [tick, setTick] = React.useState(0);
  const last = React.useRef(Date.now());

  const bump = React.useCallback((force = false) => {
    // Several triggers often fire together (focus + visibility + online): one refresh is enough.
    if (!force && Date.now() - last.current < MIN_GAP_MS) return;
    last.current = Date.now();
    setTick((n) => n + 1);
  }, []);

  // Shown again after being swiped away.
  const wasActive = React.useRef(active);
  React.useEffect(() => {
    if (active && !wasActive.current) bump();
    wasActive.current = active;
  }, [active, bump]);

  // The server says something changed: re-read right away.
  React.useEffect(() => {
    if (!active) return;
    return subscribe(() => bump(true));
  }, [active, bump]);

  React.useEffect(() => {
    if (!active) return;
    const onBack = () => {
      if (document.visibilityState === 'visible') bump();
    };
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) bump();
    }, intervalMs);
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    window.addEventListener('online', onBack);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
      window.removeEventListener('online', onBack);
    };
  }, [active, intervalMs, bump]);

  return tick;
}
