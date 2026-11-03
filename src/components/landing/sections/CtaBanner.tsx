'use client';


import Image from 'next/image';
import { useTranslations } from 'next-intl';import Link from 'next/link';

export function CtaBanner({ locale }: { locale: string }) {
  const t = useTranslations('landing.cta');
  return (
    <section className="grain relative overflow-hidden py-36 sm:py-48 select-none">
      <Image
        src="/images/golden/hero-car.jpg"
        sizes="100vw"
        alt={t('alt')}
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-80 pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(10, 11, 15, 0.45) 0%, rgba(10, 11, 15, 0.75) 65%, #0A0B0F 100%), linear-gradient(180deg, #0A0B0F 0%, transparent 25%, transparent 75%, #0A0B0F 100%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="reveal font-display text-5xl font-light leading-[1.02] sm:text-7xl">
          {t('title')} <br />
          <span className="shimmer-text italic">{t('gold')}</span>
        </h2>
        <div className="reveal mt-12">
          <Link
            href={`/${locale}/register`}
            className="btn-gold sweep relative inline-flex overflow-hidden rounded-full px-12 py-5 text-xs font-bold tracking-[0.3em]"
          >
            {t('button')}
          </Link>
        </div>
      </div>
    </section>
  );
}
