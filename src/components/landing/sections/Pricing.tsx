'use client';


import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Check,
} from 'lucide-react';
import { SectionHeading } from './shared';

// Prices, image counts and device limits must match the `plans` table (GET /api/v1/plans):
// that is what checkout charges and what the app enforces.
const TIERS: {
  key: 'free' | 'pro' | 'max';
  name: string;
  price: number;
  /** Values interpolated into the plan's feature texts. */
  items: { key: string; values?: Record<string, number> }[];
  hot: boolean;
}[] = [
  {
    key: 'free',
    name: 'FREE',
    price: 0,
    items: [{ key: 'i1' }, { key: 'i2' }, { key: 'i3' }, { key: 'i4' }, { key: 'i5' }],
    hot: false,
  },
  {
    key: 'pro',
    name: 'PRO',
    price: 29,
    items: [{ key: 'i1', values: { count: 800 } }, { key: 'i2' }, { key: 'i3', values: { count: 2 } }, { key: 'i4' }, { key: 'i5' }],
    hot: false,
  },
  {
    key: 'max',
    name: 'MAX',
    price: 99,
    items: [{ key: 'i1', values: { count: 4000 } }, { key: 'i2' }, { key: 'i3', values: { count: 4 } }, { key: 'i4' }, { key: 'i5' }],
    hot: true,
  },
];

export function Pricing({ locale }: { locale: string }) {
  const t = useTranslations('landing.pricing');

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          gold={t('gold')}
        />
      </div>

      <div className="reveal mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier, idx) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-3xl border p-9 transition-all duration-700 hover:-translate-y-2 ${
 tier.hot
 ? ' bg-card-lux shadow-gold lg:-translate-y-4'
                : ' bg-card/40'
            }`}
            style={{ transitionDelay: `${idx * 120}ms` }}
          >
            {tier.hot && (
              <span className="btn-gold absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-full px-4 py-1 text-[9px] sm:text-[10px] font-bold tracking-[0.12em] whitespace-nowrap shadow-gold">
                {t('popular')}
              </span>
            )}
            <p className="text-[11px] tracking-lux text-primary">{t(`${tier.key}.tier`)}</p>
            <h3 className="mt-4 font-display text-3xl">{tier.name}</h3>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-6xl text-gold">
                $
                {tier.price}
              </span>
              <span className="text-sm text-muted-foreground">/ {t(`${tier.key}.per`)}</span>
            </p>

            <p className="mt-4 text-sm text-muted-foreground">{t(`${tier.key}.d`)}</p>

            <ul className="mt-8 flex-1 space-y-3 text-sm">
              {tier.items.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {t(`${tier.key}.${item.key}`, item.values)}
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/login`}
              className={`${
 tier.hot ? 'btn-gold' : 'btn-ghost-gold'
 } mt-10 rounded-full py-4 text-center text-xs font-bold tracking-[0.25em]`}
            >
              {t(`${tier.key}.cta`)}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
