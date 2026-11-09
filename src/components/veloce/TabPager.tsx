'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TabActiveContext } from '@/lib/live';
import { isStandalone } from '@/components/pwa/install';

export interface PagerTab {
  key: string;
  href: string;
  render: () => React.ReactNode;
}

interface TabPagerProps {
  tabs: PagerTab[];
  /** Index of the tab the URL points at. */
  index: number;
  /** -1 in right-to-left layouts. */
  dir: 1 | -1;
  /** While the finger drags: the (fractional) tab position, so the dock can follow live. */
  onScrub?: ((pos: number) => void) | undefined;
  /** The finger lifted: the tab the pager is settling on. */
  onSettle?: ((index: number) => void) | undefined;
}

function insideHorizontalScroller(el: HTMLElement, stop: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== stop; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const ox = getComputedStyle(node).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

/** Fraction of the width (or a flick) that commits a swipe to the next tab. */
const COMMIT_RATIO = 0.33;
const FLICK_PX_PER_MS = 0.35;
/** Movement before we decide between a horizontal swipe and a vertical scroll. */
const SLOP_PX = 8;
/** iOS / Android browsers own swipes that start at the screen edge (back / forward). */
const EDGE_PX = 22;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * The bottom-dock tabs laid out side by side like a native app: swipe left / right to move between
 * them, the next tab follows the finger from the first pixel, and a tap on the dock slides there.
 *
 * - Every tab is its own vertical scroller (keeps its scroll, no rubber-band) and stays mounted, so
 *   coming back is instant; neighbours mount in idle time so the first swipe never stutters.
 * - The track moves with `transform` only and is driven outside React while dragging (no re-render
 *   per frame). Vertical scrolling stays fully native (`touch-action: pan-y`): the browser takes a
 *   vertical gesture, we take a horizontal one. Horizontal scrollers inside a tab (filter chips)
 *   keep their own swipes, and swipes from the very edge are left to the browser's back gesture
 *   (except inside the installed app, where there is none).
 */
export function TabPager({ tabs, index, dir, onScrub, onSettle }: TabPagerProps) {
  const router = useRouter();
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const widthRef = React.useRef(0);
  const [current, setCurrent] = React.useState(index);
  const currentRef = React.useRef(index);
  const [mounted, setMounted] = React.useState<Set<number>>(() => new Set([index]));
  const gesture = React.useRef({
    id: -1,
    state: 'idle' as 'idle' | 'pending' | 'drag' | 'scroll',
    x0: 0,
    y0: 0,
    dx: 0,
    samples: [] as Array<{ x: number; t: number }>,
    moved: false,
  });

  const mount = React.useCallback((...ids: number[]) => {
    setMounted((prev) => {
      const ok = ids.filter((i) => i >= 0 && i < tabs.length && !prev.has(i));
      if (ok.length === 0) return prev;
      const next = new Set(prev);
      ok.forEach((i) => next.add(i));
      return next;
    });
  }, [tabs.length]);

  const place = React.useCallback(
    (i: number, offset: number, animateMs: number) => {
      const track = trackRef.current;
      if (!track) return;
      const x = dir * -i * widthRef.current + offset;
      track.style.transition = animateMs > 0 ? `transform ${animateMs}ms ${EASE}` : 'none';
      track.style.transform = `translate3d(${x}px,0,0)`;
    },
    [dir]
  );

  // Width follows the viewport (rotation, sidebar on tablets).
  React.useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const measure = () => {
      widthRef.current = vp.clientWidth;
      place(currentRef.current, 0, 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [place]);

  // The URL changed (dock tap, back button): slide there.
  React.useEffect(() => {
    if (index === currentRef.current) return;
    const distance = Math.abs(index - currentRef.current);
    currentRef.current = index;
    setCurrent(index);
    mount(index);
    place(index, 0, Math.min(260 + distance * 60, 420));
  }, [index, mount, place]);

  // Neighbours load quietly after the first paint, so the first swipe already shows them.
  React.useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const run = () => mount(current - 1, current + 1);
    if (typeof ric === 'function') ric(run, { timeout: 1200 });
    else window.setTimeout(run, 600);
  }, [current, mount]);

  const settle = (target: number, velocity: number) => {
    const from = currentRef.current;
    const clamped = Math.max(0, Math.min(tabs.length - 1, target));
    // Faster flicks finish faster, like a native pager.
    const ms = Math.round(Math.max(180, Math.min(380, 380 - Math.abs(velocity) * 260)));
    currentRef.current = clamped;
    place(clamped, 0, ms);
    onSettle?.(clamped);
    if (clamped !== from) {
      setCurrent(clamped);
      const tab = tabs[clamped];
      if (tab) router.push(tab.href, { scroll: false });
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || tabs.length < 2) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable], [data-no-swipe]')) return;
    // A horizontal scroller (filter chips, carousels) owns every sideways swipe that starts on it,
    // even at its ends, so the tabs never jump while the user is browsing a row.
    if (target && insideHorizontalScroller(target, e.currentTarget)) return;
    const w = widthRef.current || window.innerWidth;
    const fromEdge = e.clientX < EDGE_PX || e.clientX > w - EDGE_PX;
    if (fromEdge && !isStandalone()) return; // the browser's own back / forward swipe
    const g = gesture.current;
    g.id = e.pointerId;
    g.state = 'pending';
    g.x0 = e.clientX;
    g.y0 = e.clientY;
    g.dx = 0;
    g.moved = false;
    g.samples = [{ x: e.clientX, t: e.timeStamp }];
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (e.pointerId !== g.id || g.state === 'idle' || g.state === 'scroll') return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (g.state === 'pending') {
      if (Math.abs(dy) > SLOP_PX && Math.abs(dy) > Math.abs(dx)) {
        g.state = 'scroll';
        return;
      }
      if (Math.abs(dx) < SLOP_PX || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      g.state = 'drag';
      g.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      mount(currentRef.current - 1, currentRef.current + 1);
    }
    // Moving past the first / last tab meets growing resistance instead of empty space.
    const step = -Math.sign(dx) * dir; // +1 = towards the next tab
    const hasNeighbour = currentRef.current + step >= 0 && currentRef.current + step < tabs.length;
    const offset = hasNeighbour ? dx : dx * 0.28;
    g.dx = dx;
    g.samples.push({ x: e.clientX, t: e.timeStamp });
    if (g.samples.length > 6) g.samples.shift();
    place(currentRef.current, offset, 0);
    if (onScrub && widthRef.current > 0) onScrub(currentRef.current - (offset * dir) / widthRef.current);
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current;
    if (e.pointerId !== g.id) return;
    const wasDrag = g.state === 'drag';
    g.state = 'idle';
    g.id = -1;
    if (!wasDrag) return;
    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const v = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0; // px/ms
    const w = widthRef.current || 1;
    const step = -Math.sign(g.dx) * dir;
    const committed = !cancelled && (Math.abs(g.dx) > w * COMMIT_RATIO || (Math.abs(v) > FLICK_PX_PER_MS && Math.sign(v) === Math.sign(g.dx)));
    settle(committed ? currentRef.current + step : currentRef.current, v);
  };

  // A swipe must not end as a tap on whatever was under the finger.
  const onClickCapture = (e: React.MouseEvent) => {
    if (gesture.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      gesture.current.moved = false;
    }
  };

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onClickCapture={onClickCapture}
    >
      <div ref={trackRef} className="flex h-full will-change-transform" style={{ width: `${tabs.length * 100}%` }}>
        {tabs.map((tab, i) => {
          const active = i === current;
          return (
            <section
              key={tab.key}
              aria-hidden={!active}
              // Off-screen tabs are not focusable or read out.
              {...(!active ? { inert: true } : {})}
              className="h-full shrink-0 overflow-y-auto overflow-x-hidden overscroll-y-none [contain:content] [touch-action:pan-y] pb-[var(--dock-h,72px)] md:pb-12"
              style={{ width: `${100 / tabs.length}%` }}
            >
              <TabActiveContext.Provider value={active}>{mounted.has(i) ? tab.render() : null}</TabActiveContext.Provider>
            </section>
          );
        })}
      </div>
    </div>
  );
}
