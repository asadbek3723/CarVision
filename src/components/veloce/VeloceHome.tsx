'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronRight,
  ArrowUpRight,
  Cog,
  Paintbrush,
  Activity,
} from 'lucide-react';
import { ProductCard } from '@/components/veloce/ProductCard';
import { useVeloceStore } from '@/context/VeloceStore';
import { type VeloceProduct } from '@/domain/veloce-catalog';

const STATS = [
  { v: '1,240+', l: 'Premium parts' },
  { v: '86', l: 'Elite brands' },
  { v: '24h', l: 'Express fitting' },
  { v: '4.9', l: 'Client rating' },
];

const FEATURES = [
  {
    icon: Cog,
    title: 'Performance',
    items: ['Engine', 'Tuning', 'Exhaust'],
  },
  {
    icon: Paintbrush,
    title: 'Style',
    items: ['Wheels', 'Body kits', 'Colors'],
  },
  {
    icon: Activity,
    title: 'Track',
    items: ['Lap times', 'Analytics', 'Improve'],
  },
];

export function VeloceHome() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { openCamera } = useVeloceStore();

  const [trendingProducts, setTrendingProducts] = React.useState<VeloceProduct[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/products?limit=4')
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.products) && data.products.length > 0) {
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
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute start-1/2 top-1/3 h-[60%] w-[80%] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative mx-auto max-w-[1500px] lg:grid lg:min-h-[calc(100vh-81px)] lg:grid-cols-12 lg:items-center lg:px-14">
          {/* Car visual right column on desktop */}
          <div className="relative lg:order-2 lg:col-span-7 lg:-me-40 lg:-ms-16 xl:scale-110">
            <img
              src="/assets/car-CjioCIbt.jpg"
              alt="Black performance coupe"
              width={1920}
              height={1088}
              className="reveal relative w-full object-cover mix-blend-lighten [mask-image:radial-gradient(ellipse_65%_62%_at_55%_50%,black_55%,transparent_88%)]"
            />
          </div>

          {/* Copy and CTA left column on desktop */}
          <div className="relative z-10 -mt-6 px-6 text-center lg:order-1 lg:col-span-5 lg:mt-0 lg:px-0 lg:text-start">
            <p className="rise mb-6 hidden text-[10px] tracking-[0.5em] text-primary uppercase lg:block">
              <span className="me-3 inline-block h-px w-10 bg-primary align-middle" />
              Est. 2026 · Atelier
            </p>

            <h1
              className="rise font-display text-[34px] font-extralight leading-[1.15] tracking-[0.32em] sm:text-5xl lg:text-[44px] lg:tracking-[0.24em] xl:text-[54px]"
              style={{ animationDelay: '120ms' }}
            >
              BUILT
              <br />
              <span className="font-light text-gold-gradient">DIFFERENT</span>
            </h1>

            <p
              className="rise mt-5 font-display text-[11px] font-light tracking-[0.45em] text-muted-foreground uppercase"
              style={{ animationDelay: '220ms' }}
            >
              Tune <span className="text-primary">•</span> Style{' '}
              <span className="text-primary">•</span> Perform
            </p>

            <p
              className="rise mx-auto mt-6 hidden max-w-sm text-sm leading-relaxed text-muted-foreground lg:mx-0 lg:block"
              style={{ animationDelay: '300ms' }}
            >
              Photograph your car, then try forged wheels, carbon aero and bespoke paint
              from our atelier — before a single bolt is turned.
            </p>

            <div
              className="rise mt-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start"
              style={{ animationDelay: '380ms' }}
            >
              <button
                onClick={openCamera}
                className="shimmer group inline-flex items-center gap-6 rounded-xl bg-gold-gradient py-4 ps-7 pe-5 font-display text-[11px] font-semibold tracking-[0.25em] text-black uppercase shadow-gold transition hover:brightness-110 active:scale-95 cursor-pointer"
              >
                Customize your ride
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>

              <Link
                href={`/${locale}/shop`}
                className="group hidden items-center gap-2 font-display text-[11px] tracking-[0.3em] uppercase text-foreground/80 transition hover:text-primary lg:inline-flex"
              >
                Explore shop
                <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Stats strip (desktop only) */}
        <div className="relative mx-auto hidden max-w-[1500px] px-14 pb-10 lg:block">
          <div className="grid grid-cols-4 border-y border-primary/15">
            {STATS.map((s, idx) => (
              <div
                key={s.l}
                className="rise border-e border-primary/15 py-6 ps-8 last:border-e-0"
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
      <div className="mx-auto max-w-[1500px] px-5 md:px-10 lg:px-14">
        {/* 3 Bento Feature Cards */}
        <section className="mt-10 grid grid-cols-3 gap-3 md:gap-6 lg:mt-16">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rise group relative overflow-hidden rounded-2xl border border-primary/15 bg-card-gradient px-2 py-6 text-center shadow-card transition duration-500 hover:-translate-y-1 hover:border-primary/50 md:p-10 lg:text-start"
                style={{ animationDelay: `${300 + idx * 100}ms` }}
              >
                <div className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary/0 blur-2xl transition duration-700 group-hover:bg-primary/20" />
                <Icon
                  strokeWidth={1.4}
                  className="mx-auto h-8 w-8 text-primary transition duration-700 group-hover:rotate-90 lg:mx-0 lg:h-10 lg:w-10"
                />
                <h3 className="mt-4 font-display text-[10px] font-medium tracking-[0.2em] uppercase sm:text-xs md:text-sm md:tracking-[0.3em] text-white">
                  {feat.title}
                </h3>
                <ul className="mt-3 space-y-1.5 text-[9px] tracking-[0.2em] text-muted-foreground uppercase md:text-[11px]">
                  {feat.items.map((item) => (
                    <li key={item}>{item}</li>
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
              <p className="text-[10px] tracking-[0.5em] text-primary uppercase">Curated</p>
              <h2 className="mt-2 font-display text-lg font-light tracking-[0.3em] uppercase lg:text-2xl text-white">
                Trending parts
              </h2>
            </div>
            <Link
              href={`/${locale}/shop`}
              className="flex items-center font-display text-[10px] tracking-[0.3em] text-primary uppercase hover:brightness-125"
            >
              View all <ChevronRight className="h-4 w-4 ms-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {isLoadingTrending ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-[#12141C] animate-pulse" />
              ))
            ) : (
              trendingProducts.map((p, idx) => (
                <ProductCard key={p.id} p={p} i={idx} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
