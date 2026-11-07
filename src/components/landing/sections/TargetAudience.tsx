'use client';


import { useTranslations } from 'next-intl';import Link from 'next/link';
import {
  Building2,
  Check,
  User,
  ArrowRight,
} from 'lucide-react';
import { SectionHeading } from './shared';

const AUDIENCE_CARDS = [
  { icon: Building2, key: 'c1', items: ['i1', 'i2', 'i3'], link: 'register' },
  { icon: User, key: 'c2', items: ['i1', 'i2', 'i3', 'i4'], link: 'login' },
] as const;

export function TargetAudience({ locale }: { locale: string }) {
  const t = useTranslations('landing.aud');
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        gold={t('gold')}
      />

      <div className="mt-20 grid gap-6 lg:grid-cols-2">
        {AUDIENCE_CARDS.map((card, idx) => (
          <div
            key={card.key}
            className="reveal relative overflow-hidden rounded-3xl bg-card-lux p-7 sm:p-10 shadow-lux"
            style={{ transitionDelay: `${idx * 150}ms` }}
          >
            <div className="absolute -end-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] tracking-[0.25em] text-primary">
              <card.icon className="h-3.5 w-3.5" />
              {t(`${card.key}.tag`)}
            </span>
            <h3 className="mt-6 font-display text-4xl">{t(`${card.key}.t`)}</h3>
            <p className="mt-4 text-muted-foreground">{t(`${card.key}.d`)}</p>

            <ul className="mt-8 space-y-3 text-sm">
              {card.items.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary" />
                  {t(`${card.key}.${item}`)}
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/${card.link}`}
              className={`${
 idx === 0 ? 'btn-gold' : 'btn-ghost-gold'
 } mt-10 flex items-center justify-center gap-2 rounded-full py-4 text-xs font-bold tracking-[0.25em]`}
            >
              <span>{t(`${card.key}.cta`)}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
