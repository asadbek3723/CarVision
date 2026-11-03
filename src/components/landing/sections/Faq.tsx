'use client';


import { useTranslations } from 'next-intl';import * as React from 'react';
import {
  ChevronDown,
} from 'lucide-react';
import { SectionHeading } from './shared';

const FAQS = ['1', '2', '3', '4'] as const;

export function Faq() {
  const t = useTranslations('landing.faq');
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-20 sm:py-32">
      <SectionHeading
        center={true}
        eyebrow={t('eyebrow')}
        title={t('title')}
        gold={t('gold')}
      />

      <div className="reveal mt-16 space-y-3">
        {FAQS.map((n, idx) => {
          const q = t(`q${n}`);
          const a = t(`a${n}`);
          const isOpen = openIdx === idx;
          return (
            <div
              key={q}
              className={`overflow-hidden rounded-2xl border transition-colors duration-500 ${
                isOpen
                  ? 'border-primary/40 bg-card-lux shadow-lux'
                  : 'border-border bg-card/30 hover:border-primary/20'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-4 px-7 py-6 text-start cursor-pointer transition-colors hover:text-primary"
              >
                <span className="font-medium text-foreground">{q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-primary transition-transform duration-500 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-500 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden min-h-0 px-7 text-muted-foreground">
                  <p className="pb-6 leading-relaxed text-sm sm:text-base">{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
