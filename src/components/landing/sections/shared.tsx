'use client';

import * as React from 'react';

export function BrandMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cv-gold-mark" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="oklch(0.93 0.05 90)" />
          <stop offset="1" stopColor="oklch(0.68 0.11 68)" />
        </linearGradient>
      </defs>
      <path
        d="M38 3H14L3 16l11 13h24"
        stroke="url(#cv-gold-mark)"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWithText({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <BrandMark className={small ? 'h-5 w-6' : 'h-7 w-8'} />
      <span
        className={`font-display tracking-[0.3em] text-foreground ${
 small ? 'text-base' : 'text-lg'
 }`}
      >
        CARVISION
      </span>
    </span>
  );
}

export function useReveal() {
  React.useEffect(() => {
    const root = document.documentElement;
    const show = (el: Element) => {
      el.classList.add('in');
      el.setAttribute('data-revealed', 'true');
    };
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach(show);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const watch = (scope: ParentNode) =>
      scope.querySelectorAll('.reveal:not(.in)').forEach((el) => observer.observe(el));
    watch(document);
    // Sections that mount later (lazy parts, language switch) are picked up too.
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && (n.matches('.reveal') ? observer.observe(n) : watch(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // Only now may content start hidden: without JS (or if this hook never runs) nothing stays invisible.
    root.classList.add('reveal-ready');
    return () => {
      observer.disconnect();
      mo.disconnect();
      root.classList.remove('reveal-ready');
    };
  }, []);
}


/* ===================================================================
   Section Heading Component
   =================================================================== */

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  gold: string;
  sub?: string | undefined;
  center?: boolean | undefined;
  /** Heading that sits in a column next to an image. */
  compact?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  gold,
  sub,
  center,
  compact,
}: SectionHeadingProps) {
  return (
    // Wide enough that each phrase usually stays on one line: a 72px heading squeezed into 768px
    // broke into four lines whose letters touched.
    <div className={`reveal ${center ? 'mx-auto text-center' : ''} ${compact ? 'max-w-3xl' : 'max-w-5xl'}`}>
      <p className="text-[11px] tracking-lux text-primary">{eyebrow}</p>
      <h2
        className={`mt-5 font-display font-light ${
          // Beside a picture the column is narrow: a smaller size keeps each phrase on one line.
          compact ? 'text-4xl leading-[1.1] sm:text-5xl xl:text-[3.5rem]' : 'text-4xl leading-[1.12] sm:text-5xl lg:text-6xl'
        }`}
      >
        {title} <br />
        <span className="text-gold italic">{gold}</span>
      </h2>
      {sub && (
        <p
          className={`mt-6 text-lg text-muted-foreground ${
 center ? 'mx-auto' : ''
 } max-w-2xl`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
