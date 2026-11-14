'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { SectionHeading } from './shared';

/**
 * Names are real people and stay untranslated; role and quote come from `landing.reviews.<key>`.
 * Add a review by adding a line here and `landing.reviews.rN.{role,text}` in every messages file.
 */
const REVIEWS = [
  { key: 'r1', n: 'Jasur Karimov' },
  { key: 'r2', n: 'Dilnoza Rahimova' },
  { key: 'r3', n: 'Aziz Tursunov' },
  { key: 'r4', n: 'Sardor Aliyev' },
] as const;

type Review = (typeof REVIEWS)[number];

const AUTOPLAY_MS = 3000;
const SLIDE_MS = 650;
const COPIES = 5;

/**
 * Endless review ribbon: 1 card on phones, 2 on tablets, 4 on desktop. It moves one card every
 * 3 seconds, the arrows move it by one, and it can be dragged like a wheel (a fast flick spins
 * several cards). The list is drawn five times; once a move has settled outside the middle copy,
 * the ribbon jumps to the same card in the middle copy without animation, so it never runs out.
 */
export function Reviews() {
  const t = useTranslations('landing.reviews');
  const n: number = REVIEWS.length;
  const slides = React.useMemo(() => Array.from({ length: COPIES }, () => REVIEWS).flat(), []);
  /** First card of the middle copy. */
  const base = n * Math.floor(COPIES / 2);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(base);
  const [animate, setAnimate] = React.useState(true);
  const [step, setStep] = React.useState(0);
  const [drag, setDrag] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [rtl, setRtl] = React.useState(false);
  const dragging = React.useRef<{ x: number; y: number; t: number; locked: boolean | null } | null>(null);

  // Card width in px (one slide = one card), re-measured whenever the viewport resizes.
  React.useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setRtl(getComputedStyle(el).direction === 'rtl');
    const measure = () => {
      const card = el.querySelector<HTMLElement>('[data-slide]');
      if (card) setStep(card.getBoundingClientRect().width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = React.useCallback((delta: number) => {
    setAnimate(true);
    setIndex((i) => i + delta);
  }, []);

  // Autoplay, one card at a time; stops while hovered, dragged, off screen or with reduced motion.
  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) go(1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, go]);

  // Once a move has settled outside the middle copy, jump back into it (same card, no animation).
  // A timer rather than transitionend: that event is skipped when a move is interrupted.
  React.useEffect(() => {
    if (index >= base && index < base + n) return;
    const id = window.setTimeout(() => {
      if (dragging.current?.locked) return;
      setAnimate(false);
      setIndex(((((index - base) % n) + n) % n) + base);
    }, SLIDE_MS + 40);
    return () => window.clearTimeout(id);
  }, [index, base, n]);

  // Re-enable the animation on the frame after a silent jump.
  React.useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const dir = rtl ? 1 : -1;
  const offset = dir * index * step + drag;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = { x: e.clientX, y: e.clientY, t: performance.now(), locked: null };
    setPaused(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.locked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // Mostly vertical: the page scrolls; mostly horizontal: the ribbon follows the finger.
      d.locked = Math.abs(dx) > Math.abs(dy);
      if (!d.locked) {
        dragging.current = null;
        setPaused(false);
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      setAnimate(false);
    }
    setDrag(dx);
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = dragging.current;
    dragging.current = null;
    setPaused(false);
    if (!d || !d.locked || !step) return;
    const dx = e.clientX - d.x;
    const velocity = dx / Math.max(1, performance.now() - d.t); // px per ms
    // Distance plus a flick bonus, like letting go of a spinning wheel.
    const cards = Math.round((dx + velocity * 220) / step);
    const moved = cards === 0 && Math.abs(dx) > step * 0.18 ? Math.sign(dx) : cards;
    const clamped = Math.max(-n, Math.min(n, moved));
    setAnimate(true);
    setDrag(0);
    setIndex((i) => i + clamped * dir);
  };

  return (
    <section id="reviews" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} gold={t('gold')} />
        <div className="reveal flex shrink-0 gap-3">
          <ArrowButton label={t('prev')} onClick={() => go(-1)}>
            <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" />
          </ArrowButton>
          <ArrowButton label={t('next')} onClick={() => go(1)}>
            <ChevronRight className="h-5 w-5 rtl:-scale-x-100" />
          </ArrowButton>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="reveal -mx-2.5 mt-12 cursor-grab select-none overflow-hidden py-4 active:cursor-grabbing sm:mt-16"
        style={{ touchAction: 'pan-y' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => !dragging.current && setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-roledescription="carousel"
      >
        <div
          className="flex"
          style={{
            transform: `translate3d(${offset}px, 0, 0)`,
            transition: animate && drag === 0 ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
          }}
        >
          {slides.map((review, i) => (
            <div
              key={`${review.key}-${i}`}
              data-slide
              className="w-full shrink-0 px-2.5 sm:w-1/2 lg:w-1/4"
              aria-hidden={i < base || i >= base + n ? true : undefined}
            >
              <ReviewCard review={review} text={t(`${review.key}.text`)} role={t(`${review.key}.role`)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="glass grid h-12 w-12 place-items-center rounded-full text-muted-foreground transition-all duration-500 hover:-translate-y-0.5 hover:text-primary hover:shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {children}
    </button>
  );
}

function ReviewCard({ review, text, role }: { review: Review; text: string; role: string }) {
  return (
    <figure className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-all duration-700 hover:-translate-y-2 hover:shadow-gold">
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      <Quote className="h-7 w-7 text-primary/40" />

      <div className="mt-4 flex text-primary">
        {Array.from({ length: 5 }).map((_, sIdx) => (
          <Star key={sIdx} className="h-4 w-4 fill-current" />
        ))}
      </div>

      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">&ldquo;{text}&rdquo;</blockquote>

      <figcaption className="mt-6 flex items-center gap-3">
        <span className="btn-gold grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-lg font-semibold text-primary-foreground">
          {review.n
            .split(' ')
            .map((w) => w[0])
            .join('')}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{review.n}</span>
          <span className="block truncate text-xs text-muted-foreground">{role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
