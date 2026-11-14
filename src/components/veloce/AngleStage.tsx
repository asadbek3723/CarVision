'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Spring-like ease with a small overshoot: the photo settles into place like it is on a spring. */
const SPRING = 'transform 640ms cubic-bezier(0.32, 1.32, 0.48, 1)';

/**
 * Desktop photo of the car: one slide per photographed side. Drag it left / right (mouse or
 * trackpad press) or use the soft arrows on its edges to move to the next side; the strip slides
 * over with a springy settle. `renderSlide` draws each side (the active one may be a before / after
 * comparison, which then owns the drag, so swiping is turned off with `swipe={false}`).
 */
export function AngleStage({
  ids,
  activeId,
  onChange,
  renderSlide,
  swipe,
  width,
  height,
  prevLabel,
  nextLabel,
  stageRef,
}: {
  ids: string[];
  activeId: string;
  onChange: (id: string) => void;
  renderSlide: (id: string, active: boolean) => React.ReactNode;
  swipe: boolean;
  width: number;
  height: number;
  prevLabel: string;
  nextLabel: string;
  stageRef?: React.Ref<HTMLDivElement>;
}) {
  const index = Math.max(0, ids.indexOf(activeId));
  const [drag, setDrag] = React.useState(0);
  const [rtl, setRtl] = React.useState(false);
  const box = React.useRef<HTMLDivElement | null>(null);
  const start = React.useRef<{ x: number; y: number; t: number; locked: boolean | null } | null>(null);
  const moved = React.useRef(false);

  React.useLayoutEffect(() => {
    if (box.current) setRtl(getComputedStyle(box.current).direction === 'rtl');
  }, []);

  const go = React.useCallback(
    (delta: number) => {
      if (ids.length < 2) return;
      const next = ids[(index + delta + ids.length) % ids.length];
      if (next) onChange(next);
    },
    [ids, index, onChange]
  );

  const canSwipe = swipe && ids.length > 1;
  const onPointerDown = (e: React.PointerEvent) => {
    if (!canSwipe || e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), locked: null };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.locked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      s.locked = Math.abs(dx) > Math.abs(dy);
      if (!s.locked) {
        start.current = null;
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    moved.current = true;
    // Rubber band past the first and last side.
    const atEdge = (dx > 0 && index === 0 && !rtl) || (dx < 0 && index === ids.length - 1 && !rtl);
    setDrag(atEdge ? dx * 0.35 : dx);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.locked) return;
    const dx = e.clientX - s.x;
    const speed = dx / Math.max(1, performance.now() - s.t);
    setDrag(0);
    const passed = Math.abs(dx) > width * 0.18 || Math.abs(speed) > 0.5;
    if (passed) go((dx < 0 ? 1 : -1) * (rtl ? -1 : 1));
  };

  const sign = rtl ? 1 : -1;
  const offset = sign * index * width + drag;

  return (
    <div
      ref={(el) => {
        box.current = el;
        if (typeof stageRef === 'function') stageRef(el);
        else if (stageRef) (stageRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      style={{ width: width || undefined, height: height || undefined, touchAction: canSwipe ? 'pan-y' : undefined }}
      className={`group relative overflow-hidden rounded-[28px] bg-surface-1 shadow-[0_28px_80px_rgba(0,0,0,0.6)] ${canSwipe ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (moved.current) {
          e.stopPropagation();
          moved.current = false;
        }
      }}
    >
      <div className="flex h-full" style={{ transform: `translate3d(${offset}px,0,0)`, transition: drag === 0 ? SPRING : 'none' }}>
        {ids.map((id) => (
          <div key={id} className="relative h-full shrink-0 select-none" style={{ width: width || '100%' }} aria-hidden={id !== activeId ? true : undefined}>
            {renderSlide(id, id === activeId)}
          </div>
        ))}
      </div>

      {ids.length > 1 && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => go(-1)}
            aria-label={prevLabel}
            className="absolute start-4 top-1/2 z-[4] grid h-12 w-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/20 text-white/70 opacity-30 backdrop-blur-md transition duration-300 hover:bg-black/45 hover:text-white hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-60"
          >
            <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => go(1)}
            aria-label={nextLabel}
            className="absolute end-4 top-1/2 z-[4] grid h-12 w-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/20 text-white/70 opacity-30 backdrop-blur-md transition duration-300 hover:bg-black/45 hover:text-white hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-60"
          >
            <ChevronRight className="h-6 w-6 rtl:rotate-180" />
          </button>
        </>
      )}
    </div>
  );
}
