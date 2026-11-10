'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import { buttonClasses } from '@/components/ui';

/** A page outside the app shell (landing, login, register, scan) crashed while drawing. */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors');
  const tc = useTranslations('common');
  const tn = useTranslations('notFound');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  React.useEffect(() => {
    console.error('Page crashed:', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#07080B] p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold-500/15 text-gold-500">
        <TriangleAlert className="h-9 w-9" aria-hidden="true" />
      </span>
      <h1 className="text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{t('crashTitle')}</h1>
      <p className="max-w-xs text-sm text-white/55">{t('crashBody')}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClasses({ size: 'md' })}>
          {tc('retry')}
        </button>
        <Link href={`/${locale}`} className={buttonClasses({ size: 'md', variant: 'ghost' })}>
          {tn('home')}
        </Link>
      </div>
    </main>
  );
}
