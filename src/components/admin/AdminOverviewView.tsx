'use client';

import { useTranslations } from 'next-intl';
import { Banknote, Cpu, Package, ShieldCheck, Store, Users } from 'lucide-react';
import { BarChart, ErrorState, PageHeader, Pill, Spinner, StatTile, Surface, useAdminData, useAdminFormat } from './ui';
import { actionLabel } from './labels';
import type { AdminTab } from './AdminShell';

interface Overview {
  metrics: {
    users: number;
    sellers: number;
    shops: number;
    paidShops: number;
    freeShops: number;
    publishedItems: number;
    bookings: { pending: number; unlocked: number; redeemed: number };
    commissionUSD: number;
    payoutsOwedUSD: number;
    dealUSD: number;
    renders30d: { completed: number; failed: number; creditsUsed: number };
  };
  charts: { signups: Array<{ day: string; value: number }>; renders: Array<{ day: string; value: number }>; bookings: Array<{ day: string; value: number }> };
  recentAdminActions: Array<{ id: string; action: string; entity: string; admin: string; at: string }>;
}

export function AdminOverviewView({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const t = useTranslations('adm.overview');
  const tc = useTranslations('adm.common');
  const ta = useTranslations('adm.actions');
  const tn = useTranslations('adm.nav');
  const { nf, usd, timeAgo } = useAdminFormat();
  const { data, error, loading, reload } = useAdminData<Overview>('/api/v1/admin/overview');

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const m = data.metrics;
  const rendersTotal = m.renders30d.completed + m.renders30d.failed;

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {m.bookings.pending > 0 && (
        <button type="button" onClick={() => onNavigate('escrow')} className="mb-5 flex w-full items-center justify-between gap-3 rounded-3xl bg-amber-500/15 px-5 py-4 text-start transition hover:bg-amber-500/20">
          <span className="text-sm font-semibold text-amber-200">{t('pending', { count: m.bookings.pending })}</span>
          <span className="shrink-0 whitespace-nowrap text-xs font-bold text-amber-300">{t('view')}</span>
        </button>
      )}

      {m.payoutsOwedUSD > 0 && (
        <button type="button" onClick={() => onNavigate('escrow')} className="mb-5 flex w-full items-center justify-between gap-3 rounded-3xl bg-white/[0.05] px-5 py-4 text-start transition hover:bg-white/[0.08]">
          <span className="text-sm font-semibold text-white/85">{t('payoutsOwed', { amount: usd(m.payoutsOwedUSD) })}</span>
          <span className="shrink-0 whitespace-nowrap text-xs font-bold text-gold-500">{t('view')}</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t('users')} value={nf.format(m.users)} hint={t('usersHint', { count: nf.format(m.sellers) })} />
        <StatTile label={t('shops')} value={nf.format(m.shops)} hint={t('shopsHint', { paid: m.paidShops, free: m.freeShops })} accent="gold" />
        <StatTile label={t('items')} value={nf.format(m.publishedItems)} />
        <StatTile label={t('deposit')} value={usd(m.commissionUSD)} hint={t('dealHint', { amount: usd(m.dealUSD) })} accent="green" />
        <StatTile label={t('bookings')} value={`${m.bookings.unlocked + m.bookings.redeemed}`} hint={t('bookingsHint', { count: m.bookings.redeemed })} />
        <StatTile label={t('renders')} value={nf.format(m.renders30d.completed)} hint={rendersTotal ? t('successHint', { percent: Math.round((m.renders30d.completed / rendersTotal) * 100) }) : t('none')} />
        <StatTile label={t('failed')} value={nf.format(m.renders30d.failed)} accent={m.renders30d.failed ? 'red' : undefined} hint={t('refunded')} />
        <StatTile label={t('creditsUsed')} value={nf.format(m.renders30d.creditsUsed)} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Surface className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Users className="h-4 w-4 text-gold-500" />{t('chartSignups')}</h2>
          <BarChart points={data.charts.signups} label={t('chartSignups')} />
        </Surface>
        <Surface className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Cpu className="h-4 w-4 text-gold-500" />{t('chartRenders')}</h2>
          <BarChart points={data.charts.renders} color="#7dd3fc" label={t('chartRenders')} />
        </Surface>
        <Surface className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Banknote className="h-4 w-4 text-gold-500" />{t('chartBookings')}</h2>
          <BarChart points={data.charts.bookings} color="#6ee7b7" label={t('chartBookings')} />
        </Surface>
      </div>

      <Surface className="mt-5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-gold-500" />{t('recent')}</h2>
          <button type="button" onClick={() => onNavigate('security')} className="text-xs font-semibold text-gold-500 hover:underline">{tc('all')}</button>
        </div>
        {data.recentAdminActions.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/45">{t('noActions')}</p>
        ) : (
          <ul className="space-y-3">
            {data.recentAdminActions.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{actionLabel(ta, a.action)}</p>
                  <p className="truncate text-xs text-white/45">{a.admin}</p>
                </div>
                <Pill>{timeAgo(a.at)}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { tab: 'shops' as const, icon: Store, label: 'shops' },
          { tab: 'users' as const, icon: Users, label: 'users' },
          { tab: 'escrow' as const, icon: Banknote, label: 'sEscrow' },
          { tab: 'renders' as const, icon: Package, label: 'renders' },
        ].map((q) => (
          <button key={q.tab} type="button" onClick={() => onNavigate(q.tab)} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
            <q.icon className="h-5 w-5 text-gold-500" />
            {tn(q.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
