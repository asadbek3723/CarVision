'use client';

import * as React from 'react';

/**
 * Keeps screens fresh without reloading them.
 *
 * The tab pager keeps every tab mounted (so swiping back is instant and keeps its scroll), which
 * means a tab's first fetch alone would go stale. `useLiveTick()` returns a counter that goes up
 * whenever the data should be re-read silently:
 *  - the tab becomes the visible one again,
 *  - the app comes back to the foreground / regains focus / the network returns,
 *  - every `intervalMs` while the tab is visible.
 * Screens add the counter to their fetch effects; first loads show skeletons, later ones do not.
 */

/** True while this screen is the one on display (always true outside the tab pager). */
export const TabActiveContext = React.createContext(true);

export function useTabActive(): boolean {
  return React.useContext(TabActiveContext);
}

const MIN_GAP_MS = 4000;

export function useLiveTick(intervalMs = 30_000): number {
  const active = useTabActive();
  const [tick, setTick] = React.useState(0);
  const last = React.useRef(Date.now());

  const bump = React.useCallback(() => {
    // Several triggers often fire together (focus + visibility + online): one refresh is enough.
    if (Date.now() - last.current < MIN_GAP_MS) return;
    last.current = Date.now();
    setTick((n) => n + 1);
  }, []);

  // Shown again after being swiped away.
  const wasActive = React.useRef(active);
  React.useEffect(() => {
    if (active && !wasActive.current) bump();
    wasActive.current = active;
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
