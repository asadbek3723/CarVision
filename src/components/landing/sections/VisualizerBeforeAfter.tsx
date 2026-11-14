'use client';


import Image from 'next/image';
import { useTranslations } from 'next-intl';import * as React from 'react';
import {
  Check,
} from 'lucide-react';
import { SectionHeading } from './shared';

export function VisualizerBeforeAfter() {
  const t = useTranslations('landing.viz');
  const [sliderPos, setSliderPos] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const animFrame = React.useRef(0);

  const updatePosition = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      cancelAnimationFrame(animFrame.current);
      animFrame.current = requestAnimationFrame(() => {
        const pct = Math.min(
          100,
          Math.max(0, ((clientX - rect.left) / rect.width) * 100)
        );
        setSliderPos(pct);
      });
    }
  };

  return (
    <section
      id="visualizer"
      className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-32 lg:grid-cols-[1fr_1.2fr] lg:gap-20 xl:gap-24"
    >
      <div>
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          gold={t('gold')}
          compact
        />
        <p className="reveal mt-8 max-w-md leading-relaxed text-muted-foreground">
          {t('text')}
        </p>
        <ul className="reveal mt-10 space-y-4 text-sm">
          {(['f1', 'f2', 'f3'] as const).map((k) => t(k)).map((item) => (
            <li key={item} className="flex items-center gap-3">
              <Check className="h-4 w-4 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="reveal relative w-full">
        <div
          ref={containerRef}
          className="relative aspect-[16/9] cursor-ew-resize select-none overflow-hidden rounded-3xl shadow-lux"
          style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          isDragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          updatePosition(e.clientX);
        }}
        onPointerMove={(e) => isDragging.current && updatePosition(e.clientX)}
        onPointerUp={() => {
          isDragging.current = false;
        }}
        onPointerCancel={() => {
          isDragging.current = false;
        }}
        role="slider"
        aria-label={t('slider')}
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSliderPos((v) => Math.max(0, v - 5));
          if (e.key === 'ArrowRight') setSliderPos((v) => Math.min(100, v + 5));
        }}
      >
        <Image
          draggable={false}
          sizes="(max-width: 1280px) 100vw, 1152px"
          src="/images/golden/car-after.jpg"
          alt={t('afterAlt')}
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <Image
            draggable={false}
            sizes="(max-width: 1280px) 100vw, 1152px"
            src="/images/golden/car-before.jpg"
            alt={t('beforeAlt')}
            width={1600}
            height={912}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <span className="glass pointer-events-none absolute start-3 top-3 sm:start-4 sm:top-4 rounded-full px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
          {t('before')}
        </span>
        <span className="glass pointer-events-none absolute end-3 top-3 sm:end-4 sm:top-4 rounded-full px-3 py-1 text-[10px] tracking-[0.25em] text-primary">
          {t('after')}
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-primary shadow-gold"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="btn-gold absolute top-1/2 start-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold">
            ‹ ›
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
