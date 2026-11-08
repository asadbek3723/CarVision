'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, ArrowUpRight, Cog, Camera, Wrench } from 'lucide-react';
import { ProductCard } from '@/components/veloce/ProductCard';
import { useVeloceStore } from '@/context/VeloceStore';
import { type VeloceProduct } from '@/domain/veloce-catalog';
import { rememberProducts } from '@/features/shop/product-cache';
import { buttonClasses } from '@/components/ui';

const FEATURES = [
  { icon: Camera, key: 'f1', items: ['f1a', 'f1b'] },
  { icon: Cog, key: 'f2', items: ['f2a', 'f2b'] },
  { icon: Wrench, key: 'f3', items: ['f3a', 'f3b'] },
] as const;

interface StoreStats {
  parts: number;
  brands: number;
  workshops: number;
  vehicleModels: number;
}

export function VeloceHome() {
  const t = useTranslations('home');
  const intlLocale = useLocale();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { openCamera } = useVeloceStore();

  const [trendingProducts, setTrendingProducts] = React.useState<VeloceProduct[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = React.useState(true);
  const [stats, setStats] = React.useState<StoreStats | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/products?limit=4&locale=${locale}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.products) && data.products.length > 0) {
          rememberProducts(locale, data.products);
          setTrendingProducts(data.products);
        }
      })
      .catch((err) => console.warn('Could not load trending products:', err))
      .finally(() => {
        if (isMounted) setIsLoadingTrending(false);
      });
    return () => {
      isMounted = false;
    };
  }, [locale]);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/catalog/stats')
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d.success) setStats(d.stats);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const statItems = stats
    ? [
        { v: stats.parts.toLocaleString(intlLocale), l: t('statParts') },
        { v: stats.brands.toLocaleString(intlLocale), l: t('statBrands') },
        { v: stats.workshops.toLocaleString(intlLocale), l: t('statWorkshops') },
        { v: stats.vehicleModels.toLocaleString(intlLocale), l: t('statModels') },
      ]
    : [];

  return (
    <div>
      {/* Hero Section */}
      {/* overflow-x only: the glow must fade out on its own, not be cut off at the section's edge */}
      <section className="relative overflow-x-clip">

        <div className="relative mx-auto max-w-[1500px] lg:grid lg:min-h-[calc(100vh-81px)] lg:grid-cols-12 lg:items-center lg:px-14">
          {/* Car visual right column on desktop */}
          <div className="relative lg:order-2 lg:col-span-7 lg:-me-40 lg:-ms-16">
            <img
              src="/assets/car-CjioCIbt.jpg"
              alt={t('heroAlt')}
              width={1920}
              height={1088}
              className="relative w-full object-cover mix-blend-lighten xl:scale-110 [mask-image:radial-gradient(ellipse_70%_68%_at_58%_50%,black_55%,transparent_85%)]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-surface-0 to-transparent lg:hidden" />
          </div>

          {/* Copy and CTA left column on desktop */}
          <div className="relative z-10 -mt-4 px-6 text-start sm:px-10 lg:order-1 lg:col-span-5 lg:mt-0 lg:px-0">
            <p className="rise mb-6 hidden text-[10px] tracking-[0.5em] text-primary uppercase lg:block">
              <span className="me-3 inline-block h-px w-10 bg-primary align-middle" />
              {t('eyebrow')}
            </p>

            <h1
              className="rise font-display text-[34px] font-extralight leading-[1.2] tracking-[0.28em] sm:text-5xl lg:text-[44px] lg:tracking-[0.24em] xl:text-[54px]"
              style={{ animationDelay: '120ms' }}
            >
              BUILT
              <br />
              <span className="font-light text-gold-gradient">DIFFERENT</span>
            </h1>

            <p
              className="rise mt-4 font-display text-[11px] font-light tracking-[0.38em] text-muted-foreground uppercase sm:text-xs"
              style={{ animationDelay: '220ms' }}
            >
              Tune <span className="text-primary">•</span> Style{' '}
              <span className="text-primary">•</span> Perform
            </p>

            <p
              className="rise mt-6 hidden max-w-sm text-sm leading-relaxed text-muted-foreground lg:block"
              style={{ animationDelay: '300ms' }}
            >
              {t('heroText')}
            </p>

            <div
              className="rise mt-7 flex flex-wrap items-center gap-5"
              style={{ animationDelay: '380ms' }}
            >
              <button
                onClick={openCamera}
                className={buttonClasses({ size: 'lg', className: 'group rounded-full px-8 font-display text-[11px] uppercase tracking-[0.24em]' })}
              >
                {t('ctaCustomize')}
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>

              <Link
                href={`/${locale}/shop`}
                className="group hidden items-center gap-2 font-display text-[11px] tracking-[0.3em] uppercase text-foreground/80 transition hover:text-primary lg:inline-flex"
              >
                {t('ctaShop')}
                <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Stats strip (desktop only) */}
        <div className="relative mx-auto hidden max-w-[1500px] px-14 pb-10 lg:block">
          <div className="grid grid-cols-4 ">
            {statItems.map((s, idx) => (
              <div
                key={s.l}
                className="rise py-6 ps-8 last:border-e-0"
                style={{ animationDelay: `${500 + idx * 80}ms` }}
              >
                <div className="font-display text-3xl font-extralight text-gold-gradient">
                  {s.v}
                </div>
                <div className="mt-1 text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Page Container */}
      <div className="mx-auto max-w-[1500px] px-5 pb-6 md:px-10 lg:px-14">
        {/* 3 Bento Feature Cards */}
        <section className="mt-8 grid grid-cols-3 gap-2.5 md:gap-6 lg:mt-16">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.key}
                className="rise group relative flex min-w-0 flex-col items-center overflow-hidden rounded-[18px] bg-card-gradient px-2 py-5 text-center shadow-card transition duration-500 hover:-translate-y-1 md:p-10 lg:items-start lg:text-start"
                style={{ animationDelay: `${300 + idx * 100}ms` }}
              >
                <div className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary/0 blur-2xl transition duration-700 group-hover:bg-primary/20" />
                <Icon
                  strokeWidth={1.4}
                  className="h-7 w-7 text-primary transition duration-700 group-hover:rotate-90 lg:h-10 lg:w-10"
                />
                <h3 className="mt-3 max-w-full break-words font-display text-[10px] font-medium leading-tight tracking-[0.12em] uppercase text-white sm:text-xs md:mt-4 md:text-sm md:tracking-[0.3em]">
                  {t(`${feat.key}Title`)}
                </h3>
                <ul className="mt-2.5 max-w-full space-y-1.5 text-[9px] leading-snug tracking-[0.08em] text-muted-foreground uppercase md:mt-3 md:text-[11px] md:tracking-[0.2em]">
                  {feat.items.map((item) => (
                    <li key={item}>{t(item)}</li>
                  ))}
                </ul>
                <ArrowUpRight className="absolute end-6 top-6 hidden h-5 w-5 text-muted-foreground transition group-hover:text-primary lg:block" />
              </div>
            );
          })}
        </section>

        {/* Trending Parts */}
        <section className="mt-16 lg:mt-24">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.5em] text-primary uppercase">{t('newEyebrow')}</p>
              <h2 className="mt-2 font-display text-lg font-light tracking-[0.3em] uppercase lg:text-2xl text-white">
                {t('newTitle')}
              </h2>
            </div>
            <Link
              href={`/${locale}/shop`}
              className="flex items-center font-display text-[10px] tracking-[0.3em] text-primary uppercase hover:brightness-125"
            >
              {t('all')} <ChevronRight className="h-4 w-4 ms-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {isLoadingTrending ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-surface-1 animate-pulse" />
              ))
            ) : trendingProducts.length > 0 ? (
              trendingProducts.map((p, idx) => (
                <ProductCard key={p.id} p={p} i={idx} />
              ))
            ) : (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t('noParts')}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
