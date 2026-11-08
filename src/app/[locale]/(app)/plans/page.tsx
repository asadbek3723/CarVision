'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';

interface Plan {
  code: string;
  name: string;
  priceUSD: number;
  credits: number;
  durationDays: number;
  watermark: boolean;
  maxDevices: number;
  maxItems: number;
}

export default function PlansPage() {
  const t = useTranslations('plansPage');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/plans')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setPlans(d.plans);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const current = user?.plan?.code ?? 'FREE_TRIAL';

  return (
    <>
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-8 md:px-10 md:pt-12">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-gold-500">{t('eyebrow')}</p>
          <h1 className="mt-2 text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
            {t('intro')}
          </p>
          {user && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs text-white/75">
              {t.rich('yourPlan', {
                plan: plans.find((p) => p.code === current)?.name ?? 'Free',
                credits: user.credits_balance,
                b: (c) => <b className="text-white">{c}</b>,
                c: (c) => <b className="text-gold-500">{c}</b>,
              })}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
          </div>
        ) : error ? (
          <p className="py-20 text-center text-sm text-red-300">{t('loadError')}</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const isCurrent = p.code === current;
              const free = p.priceUSD === 0;
              return (
                <article key={p.code} className={`flex flex-col rounded-3xl p-6 shadow-e1 ${p.code === 'MAX_4000' ? 'bg-gold-500/[0.07] ring-1 ring-gold-500/25' : 'bg-surface-1'}`}>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white">{p.name}</h2>
                  <p className="mt-4 text-3xl font-bold text-white">{free ? '0' : formatPrice(p.priceUSD)}</p>
                  <p className="text-xs text-white/45">{free ? t('freeMonthly') : t('days', { count: p.durationDays })}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-white/75">
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />{free ? t('creditsMonthly', { count: p.credits }) : t('credits', { count: p.credits })}</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />{t('devices', { count: p.maxDevices })}</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />{free ? t('locked') : t('items', { count: p.maxItems })}</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />{p.watermark ? t('watermark') : t('noWatermark')}</li>
                  </ul>
                  {isCurrent ? (
                    <span className="mt-6 rounded-full bg-white/10 py-3 text-center text-xs font-bold text-white/80">{t('current')}</span>
                  ) : free ? null : (
                    <span className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] py-3 text-xs font-bold text-white/60">
                      <Lock className="h-3.5 w-3.5" />
                      {t('soon')}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!user && (
          <p className="mt-8 text-center text-sm text-white/55">
            {t.rich('signUpLead', {
              link: (c) => <Link href={`/${locale}/register`} className="text-gold-500 underline">{c}</Link>,
            })}
          </p>
        )}
      </div>
    </>
  );
}
