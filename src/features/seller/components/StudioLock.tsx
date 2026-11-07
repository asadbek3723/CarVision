'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { buttonClasses } from '@/components/ui';

/** Shown instead of Garage / Dashboard / Add product while the workshop is on the Free plan. */
export function StudioLock({ feature }: { feature: 'garage' | 'dashboard' | 'addProduct' | 'orders' | 'redeem' }) {
  const t = useTranslations('lock');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  return (
    <div className="mx-auto mt-16 max-w-md px-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/15 text-gold-500">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{t(feature)}</h1>
      <p className="mt-2 text-sm text-white/60">
        {t('body')}
      </p>
      <Link href={`/${locale}/plans`} className={buttonClasses({ size: 'md', className: 'mt-6' })}>
        {t('cta')}
      </Link>
    </div>
  );
}
