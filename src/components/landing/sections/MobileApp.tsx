'use client';


import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { InstallAppButton } from '@/components/pwa/PwaInstallPrompt';

export function MobileApp() {
  const t = useTranslations('landing.app');
  return (
    <section id="app" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-32 overflow-hidden">
      <div className="reveal relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-card-lux shadow-lux w-full">
        <div className="absolute -start-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative grid w-full min-w-0 items-center gap-8 sm:gap-10 p-5 sm:p-16 lg:grid-cols-2">
          <div className="w-full min-w-0">
            <p className="text-[11px] tracking-lux text-primary">
              {t('eyebrow')}
            </p>
            <h2 className="mt-4 sm:mt-5 font-display text-[2rem] font-light leading-[1.08] sm:text-6xl sm:leading-[1.02] break-words">
              CarVision <br />
              <span className="text-gold italic">{t('gold')}</span>
            </h2>
            <p className="mt-4 sm:mt-6 max-w-md text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t('text')}
            </p>

            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="flex text-primary">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" />
                ))}
              </span>
              <span>{t('rating')}</span>
            </div>

            {/* One real install button (the app is a web app, not a store listing): one tap on
                Android / desktop, a two-step guide on iPhone. */}
            <div className="mt-8 sm:mt-10 w-full">
              <InstallAppButton className="btn-gold sweep relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-9 py-4 text-sm font-bold tracking-[0.12em] sm:w-auto" />
              <p className="mt-3 text-xs text-muted-foreground">{t('installNote')}</p>
            </div>
          </div>

          <div className="relative flex justify-center w-full min-w-0 mt-4 sm:mt-0">
            <Image
              src="/images/golden/app-phones.jpg"
              alt={t('alt')}
              sizes="(max-width: 640px) 280px, 448px"
              width={1200}
              height={1200}
              className="animate-float mx-auto w-full max-w-[280px] sm:max-w-md mix-blend-lighten pointer-events-none select-none object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
