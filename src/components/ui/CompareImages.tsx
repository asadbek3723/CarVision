'use client';

import * as React from 'react';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/**
 * Before / after slider state. `pos` is the share of the BEFORE picture in percent, measured from
 * the inline start, so the slider, the clipped picture, the divider and the "before" badge (which
 * sits at `start`) stay on the same side in LTR and RTL languages alike.
 * Pointer events with capture work for mouse, touch and pen; arrow keys move it when focused.
 */
export function useCompareSlider(initial = 50) {
  const [pos, setPos] = React.useState(initial);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const dragging = React.useRef(false);

  const isRtl = () => (ref.current ? getComputedStyle(ref.current).direction === 'rtl' : false);

  const moveTo = React.useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fromStart = getComputedStyle(el).direction === 'rtl' ? rect.right - clientX : clientX - rect.left;
    setPos(clamp((fromStart / rect.width) * 100));
  }, []);

  const end = React.useCallback(() => {
    dragging.current = false;
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture is a nicety: moves still arrive while the pointer is over the picture
      }
      moveTo(e.clientX);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragging.current) moveTo(e.clientX);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 20 : 5;
      // Arrow keys are physical: the right arrow moves the divider to the right in both directions.
      const towardStart = isRtl() ? 'ArrowRight' : 'ArrowLeft';
      const towardEnd = isRtl() ? 'ArrowLeft' : 'ArrowRight';
      let next: number | null = null;
      if (e.key === towardStart) next = pos - step;
      else if (e.key === towardEnd) next = pos + step;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 100;
      if (next === null) return;
      e.preventDefault();
      // The page may switch angles on arrow keys: the focused slider owns them.
      e.stopPropagation();
      setPos(clamp(next));
    },
  };

  return { pos, setPos, ref, handlers };
}

interface FrameSize {
  width: number;
  height: number;
}

/** Size of a box with `aspect` that covers a `w`×`h` stage (like object-fit: cover). */
function coverSize(w: number, h: number, aspect: number): FrameSize {
  return w / h > aspect ? { width: w, height: w / aspect } : { width: h * aspect, height: h };
}

export interface CompareImagesProps {
  beforeUrl: string;
  afterUrl: string;
  /** Share of the before picture in percent, from the inline start (see `useCompareSlider`). */
  pos: number;
  beforeAlt: string;
  afterAlt: string;
}

/**
 * The two stacked pictures of a before / after comparison, filling the parent (which must be
 * `position: relative` with a size).
 *
 * Both pictures are drawn into ONE frame that has the rendered picture's own aspect ratio and covers
 * the stage. AI models return nearly but not exactly the photo's aspect ratio (Gemini snaps to
 * 4:3 / 16:9, FLUX to multiples of 16): cropping each picture separately with object-fit: cover
 * made the car jump sideways while dragging. Stretching the photo into the render's frame (a 1-2%
 * difference nobody sees) keeps every pixel of the car exactly on top of each other.
 */
export function CompareImages({ beforeUrl, afterUrl, pos, beforeAlt, afterAlt }: CompareImagesProps) {
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = React.useState<FrameSize | null>(null);
  const [rtl, setRtl] = React.useState(false);
  // Keyed by URL (no reset effect): a cached picture can fire onLoad before an effect would run.
  const [loaded, setLoaded] = React.useState<{ url: string; aspect: number | null } | null>(null);
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const afterState: 'loading' | 'ready' | 'error' =
    loaded?.url === afterUrl ? 'ready' : failedUrl === afterUrl ? 'error' : 'loading';
  const aspect = afterState === 'ready' ? (loaded?.aspect ?? null) : null;
  const afterRef = React.useRef<HTMLImageElement | null>(null);

  const markLoaded = React.useCallback((img: HTMLImageElement, url: string) => {
    const ratio = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null;
    setLoaded({ url, aspect: ratio });
  }, []);

  // A server-rendered <img> can finish loading before React attaches onLoad (hydration): it would
  // then wait forever. Check the element itself once it is in the page.
  React.useLayoutEffect(() => {
    const img = afterRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) markLoaded(img, afterUrl);
    else if (img.currentSrc) setFailedUrl(afterUrl);
  }, [afterUrl, markLoaded]);

  React.useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setStage({ width: r.width, height: r.height });
      setRtl(getComputedStyle(el).direction === 'rtl');
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frame = stage && aspect ? coverSize(stage.width, stage.height, aspect) : null;
  // Centered in the stage; physical offsets are fine here because the frame is symmetric.
  const frameStyle: React.CSSProperties | undefined = frame
    ? { position: 'absolute', width: frame.width, height: frame.height, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    : undefined;
  const imgClass = frame
    ? 'pointer-events-none absolute inset-0 h-full w-full select-none object-fill'
    : 'pointer-events-none absolute inset-0 h-full w-full select-none object-cover';

  const hidden = clamp(100 - pos);
  const clip = rtl ? `inset(0 0 0 ${hidden}%)` : `inset(0 ${hidden}% 0 0)`;

  return (
    <div ref={stageRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div style={frameStyle} className={frame ? undefined : 'absolute inset-0'}>
        <img
          ref={afterRef}
          src={afterUrl}
          alt={afterAlt}
          draggable={false}
          decoding="async"
          onLoad={(e) => markLoaded(e.currentTarget, afterUrl)}
          onError={() => setFailedUrl(afterUrl)}
          className={`${imgClass} transition-opacity duration-500 ${afterState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {/* Until the render has loaded (or if it cannot be loaded) the photo shows in full, never a blank half. */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={afterState === 'ready' ? { clipPath: clip, WebkitClipPath: clip } : undefined}
      >
        <div style={frameStyle} className={frame ? undefined : 'absolute inset-0'}>
          <img src={beforeUrl} alt={beforeAlt} draggable={false} decoding="async" className={imgClass} />
        </div>
      </div>

      {afterState === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-black/25">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold-500" aria-hidden />
        </div>
      )}
    </div>
  );
}
