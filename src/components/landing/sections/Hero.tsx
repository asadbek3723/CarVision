'use client';


import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BrandMark } from './shared';
import { startInstall } from '@/components/pwa/install';

export function Hero() {
  const t = useTranslations('landing.hero');
  return (
    <section
      id="top"
      className="grain relative flex h-[100dvh] min-h-[560px] items-center justify-center overflow-hidden"
    >
      <Image
        src="/images/golden/hero-car.jpg"
        priority
        quality={70}
        sizes="100vw"
        alt={t('alt')}
        width={1920}
        height={1088}
        className="animate-slowzoom absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 15%, rgba(10, 11, 15, 0.75) 85%), linear-gradient(180deg, rgba(10, 11, 15, 0.4) 0%, transparent 20%, transparent 70%, #0A0B0F 100%)',
        }}
      />

      <div className="relative z-10 px-6 text-center select-none">
        <div
          className="animate-rise mb-6 flex justify-center"
          style={{ animationDelay: '0s' }}
        >
          <BrandMark className="h-12 w-14" />
        </div>
        <p
          className="animate-rise text-[11px] tracking-lux text-primary"
          style={{ animationDelay: '.05s' }}
        >
          DRIVE YOUR VISION
        </p>
        <h1
          className="animate-rise mt-6 font-display text-5xl font-light leading-[0.95] text-foreground sm:text-8xl lg:text-9xl"
          style={{ animationDelay: '.1s' }}
        >
          {t('title1')} <br />
          <em className="shimmer-text not-italic font-medium italic">
            {t('title2')}
          </em>
        </h1>
        <p
          className="animate-rise mx-auto mt-8 max-w-lg text-base text-muted-foreground"
          style={{ animationDelay: '.2s' }}
        >
          {t('text')}
        </p>

        <div
          className="animate-rise mx-auto mt-10 flex max-w-xs flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4"
          style={{ animationDelay: '.3s' }}
        >
          <a
            href="#visualizer"
            className="btn-gold sweep relative w-full overflow-hidden rounded-full px-9 py-4 sm:w-auto text-xs font-bold tracking-[0.3em]"
          >
            {t('ctaVision')}
          </a>
          <button
            type="button"
            onClick={() => void startInstall()}
            className="btn-ghost-gold w-full cursor-pointer rounded-full px-9 py-4 sm:w-auto text-xs font-semibold tracking-[0.3em]"
          >
            {t('ctaApp')}
          </button>
        </div>
      </div>

      <a
        href="#visualizer"
        className="absolute bottom-10 start-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] tracking-lux text-muted-foreground rtl:translate-x-1/2 [@media(max-height:860px)]:hidden"
      >
        {t('scroll')}
        <span className="relative h-14 w-px overflow-hidden bg-border">
          <span className="animate-scrollline absolute inset-0 bg-primary" />
        </span>
      </a>
    </section>
  );
}

