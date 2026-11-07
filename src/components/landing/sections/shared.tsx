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
}

export function SectionHeading({
  eyebrow,
  title,
  gold,
  sub,
  center,
}: SectionHeadingProps) {
  return (
    <div className={`reveal ${center ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <p className="text-[11px] tracking-lux text-primary">{eyebrow}</p>
      <h2 className="mt-5 font-display text-4xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
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

export function AppStoreButton({
  icon: Icon,
  top,
  name,
}: {
  icon: React.ComponentType<{ className?: string }>;
  top: string;
  name: string;
}) {
  return (
    <a
      href="#"
      className="btn-ghost-gold flex items-center justify-center gap-3.5 sm:gap-4 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-3.5 sm:justify-start w-full sm:w-auto transition-transform active:scale-[0.98]"
    >
      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
      <span className="text-start leading-tight">
        <span className="block text-[10px] tracking-[0.2em] text-muted-foreground">
          {top}
        </span>
        <span className="block text-base sm:text-lg font-semibold">{name}</span>
      </span>
    </a>
  );
}
