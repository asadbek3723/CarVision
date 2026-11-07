'use client';


import { useTranslations } from 'next-intl';import {
  Quote,
  Star,
} from 'lucide-react';
import { SectionHeading } from './shared';

/** Names are real people and stay untranslated; role and quote come from `landing.reviews.<key>`. */
const REVIEWS = [
  { key: 'r1', n: 'Jasur Karimov' },
  { key: 'r2', n: 'Dilnoza Rahimova' },
  { key: 'r3', n: 'Aziz Tursunov' },
  { key: 'r4', n: 'Sardor Aliyev' },
] as const;

export function Reviews() {
  const t = useTranslations('landing.reviews');
  return (
    <section id="reviews" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        gold={t('gold')}
      />

      <div className="mt-14 grid gap-5 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
        {REVIEWS.map((review, idx) => (
          <figure
            key={review.n}
            className="reveal glass group relative flex flex-col overflow-hidden rounded-3xl p-7 transition-all duration-700 hover:-translate-y-2  hover:shadow-gold"
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            <Quote className="h-7 w-7 text-primary/40" />

            <div className="mt-4 flex text-primary">
              {Array.from({ length: 5 }).map((_, sIdx) => (
                <Star key={sIdx} className="h-4 w-4 fill-current" />
              ))}
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
              &ldquo;{t(`${review.key}.text`)}&rdquo;
            </blockquote>

            <figcaption className="mt-6 flex items-center gap-3">
              <span className="btn-gold grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-lg font-semibold text-primary-foreground">
                {review.n
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{review.n}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t(`${review.key}.role`)}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
