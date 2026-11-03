'use client';


import { useTranslations } from 'next-intl';import {
  Car,
  Upload,
  WandSparkles,
} from 'lucide-react';
import { SectionHeading } from './shared';

const STEPS = [
  { icon: Upload, key: 's1' },
  { icon: WandSparkles, key: 's2' },
  { icon: Car, key: 's3' },
] as const;

export function HowItWorks() {
  const t = useTranslations('landing.how');
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        gold={t('gold')}
      />

      <div className="mt-20 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, idx) => (
          <div
            key={step.key}
            className="reveal group relative overflow-hidden rounded-3xl border border-border bg-card-lux p-7 sm:p-10 transition-all duration-700 hover:-translate-y-2 hover:border-primary/40"
            style={{ transitionDelay: `${idx * 120}ms` }}
          >
            <span className="absolute -end-4 -top-10 font-display text-[11rem] font-light text-primary/5 transition-colors duration-700 group-hover:text-primary/10 select-none">
              {idx + 1}
            </span>
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 text-primary">
              <step.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-8 font-display text-3xl">{t(`${step.key}t`)}</h3>
            <p className="mt-3 text-muted-foreground">{t(`${step.key}d`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
