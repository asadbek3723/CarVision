'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { ArrowDownToLine, Banknote, CreditCard, RotateCcw, Store } from 'lucide-react';
import { EmptyState, ErrorState, LoadMore, PageHeader, Pill, Segmented, Spinner, StatTile, Surface, dateTime, useAdminData, useAdminFormat, useAdminPaged } from './ui';
import type { AdminTab } from './AdminShell';

type Period = '7' | '30' | '90' | 'month';

interface Summary {
  grossCents: number;
  ordersPaid: number;
  commissionEarnedCents: number;
  commissionInWindowCents: number;
  cancelRetainedCents: number;
  cancelledOrders: number;
  payoutsOwedCents: number;
  payoutsOwedCount: number;
  payoutsDueNowCents: number;
  refundsPendingCents: number;
  refundsPendingCount: number;
  pendingApprovals: number;
  payoutsPaidCents: number;
  refundsPaidCents: number;
  salesByCurrency: Record<string, number>;
  salesCount: number;
  creditsUsed: number;
}
interface FinanceData {
  from: string;
  to: string;
  summary: Summary;
  payoutsByShop: Array<{ shopId: string; shopName: string; payoutDetails: string | null; orders: number; owedCents: number; dueNowCents: number }>;
}
interface Transfer { id: string; kind: 'PAYOUT' | 'REFUND'; orderNumber: string; customer: string; shop: string; amountCents: number; amountUzs: number | null; reference: string; admin: string; at: string }
interface Sale { id: string; kind: 'PLAN' | 'CREDITS'; plan: string | null; credits: number; amountMinor: number; currency: string; method: string; reference: string; notes: string; customer: string; admin: string; at: string }

function range(period: Period): { from: string; to: string } {
  const to = new Date(Date.now() + 60_000);
  if (period === 'month') {
    // Calendar month in Tashkent time (UTC+5).
    const local = new Date(Date.now() + 5 * 3600_000);
    const from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 5 * 3600_000);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return { from: new Date(to.getTime() - Number(period) * 86_400_000).toISOString(), to: to.toISOString() };
}

/** Money overview: what came in, what the platform earned, what it owes, and every transfer made. */
export function AdminFinanceView({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const t = useTranslations('adm.finance');
  const { usd, money, nf } = useAdminFormat();
  const [period, setPeriod] = React.useState<Period>('30');
  const [journal, setJournal] = React.useState<'transfers' | 'sales'>('transfers');
  const [kind, setKind] = React.useState<'all' | 'PAYOUT' | 'REFUND'>('all');
  const r = React.useMemo(() => range(period), [period]);
  const qs = `from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`;
  const { data, error, loading, reload } = useAdminData<FinanceData>(`/api/v1/admin/finance?${qs}`);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const s = data.summary;
  const earned = Number(s.commissionEarnedCents) + Number(s.cancelRetainedCents);
  const sales = Object.entries(s.salesByCurrency ?? {});

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { id: '7', label: t('p7') },
          { id: '30', label: t('p30') },
          { id: '90', label: t('p90') },
          { id: 'month', label: t('pMonth') },
        ]}
      />

      <div className={`mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
        <StatTile label={t('gross')} value={usd(s.grossCents / 100)} hint={t('grossHint', { count: s.ordersPaid })} />
        <StatTile label={t('earned')} value={usd(earned / 100)} hint={t('earnedHint', { amount: usd(s.cancelRetainedCents / 100) })} accent="green" />
        <StatTile label={t('inWindow')} value={usd(s.commissionInWindowCents / 100)} hint={t('inWindowHint')} accent="amber" />
        <StatTile label={t('plansSold')} value={sales.length ? sales.map(([c, v]) => money(Number(v), c)).join(' · ') : '—'} hint={t('plansHint', { count: s.salesCount })} accent="gold" />
        <StatTile label={t('owed')} value={usd(s.payoutsOwedCents / 100)} hint={t('owedHint', { count: s.payoutsOwedCount, due: usd(s.payoutsDueNowCents / 100) })} accent={s.payoutsOwedCents ? 'gold' : undefined} />
        <StatTile label={t('refundsPending')} value={usd(s.refundsPendingCents / 100)} hint={t('countHint', { count: s.refundsPendingCount })} accent={s.refundsPendingCount ? 'amber' : undefined} />
        <StatTile label={t('paidOut')} value={usd(s.payoutsPaidCents / 100)} hint={t('refundedHint', { amount: usd(s.refundsPaidCents / 100) })} />
        <StatTile label={t('creditsUsed')} value={nf.format(Number(s.creditsUsed))} />
      </div>

      <Surface className="mt-5 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Store className="h-4 w-4 text-gold-500" />{t('byShop')}</h2>
          {data.payoutsByShop.length > 0 && <button type="button" onClick={() => onNavigate('escrow')} className="text-xs font-semibold text-gold-500 hover:underline">{t('toPayouts')}</button>}
        </div>
        {data.payoutsByShop.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/45">{t('nothingOwed')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data.payoutsByShop.map((p) => (
              <li key={p.shopId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{p.shopName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-white/45">
                    <CreditCard className="h-3.5 w-3.5 shrink-0" />
                    {p.payoutDetails ? <span className="font-mono">{p.payoutDetails}</span> : <span className="text-amber-300/80">{t('noDetails')}</span>}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold tabular-nums text-gold-500">{usd(p.owedCents / 100)}</p>
                  <p className="text-[11px] text-white/45">{t('dueNow', { amount: usd(p.dueNowCents / 100), count: p.orders })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={journal}
          onChange={setJournal}
          options={[
            { id: 'transfers', label: t('transfers') },
            { id: 'sales', label: t('sales') },
          ]}
        />
        <a
          href={`/api/v1/admin/finance/${journal}?${qs}${journal === 'transfers' && kind !== 'all' ? `&kind=${kind}` : ''}&format=csv`}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          {t('exportCsv')}
        </a>
      </div>
      {journal === 'transfers' && (
        <div className="mt-3">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { id: 'all', label: t('kindAll') },
              { id: 'PAYOUT', label: t('kindPayout') },
              { id: 'REFUND', label: t('kindRefund') },
            ]}
          />
        </div>
      )}
      <div className="mt-4">
        {journal === 'transfers' ? <TransfersList qs={`${qs}${kind !== 'all' ? `&kind=${kind}` : ''}`} /> : <SalesList qs={qs} />}
      </div>
    </div>
  );
}

function TransfersList({ qs }: { qs: string }) {
  const t = useTranslations('adm.finance');
  const { usd, uzs } = useAdminFormat();
  const { items, meta, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Transfer, { transfers: Transfer[]; total: number; nextOffset: number | null }>(`/api/v1/admin/finance/transfers?${qs}`, (p) => p.transfers);
  if (loading && !meta) return <Spinner />;
  if (error && !meta) return <ErrorState message={error} onRetry={reload} />;
  if (items.length === 0) return <EmptyState>{t('noTransfers')}</EmptyState>;
  return (
    <>
      <Surface className="divide-y divide-white/[0.06] px-5">
        {items.map((x) => (
          <div key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {x.kind === 'PAYOUT' ? <Banknote className="h-4 w-4 text-gold-500" /> : <RotateCcw className="h-4 w-4 text-amber-300" />}
                <span className="text-sm font-semibold text-white">#{x.orderNumber}</span>
                <Pill tone={x.kind === 'PAYOUT' ? 'gold' : 'amber'}>{x.kind === 'PAYOUT' ? t('kindPayout') : t('kindRefund')}</Pill>
              </div>
              <p className="mt-1 truncate text-xs text-white/55">{x.kind === 'PAYOUT' ? x.shop : x.customer} · <span className="font-mono">{x.reference}</span></p>
              <p className="mt-0.5 text-[11px] text-white/35">{dateTime(x.at)} · {x.admin}</p>
            </div>
            <div className="text-end">
              <p className="text-sm font-bold tabular-nums text-white">{usd(x.amountCents / 100)}</p>
              {x.amountUzs !== null && <p className="text-[11px] tabular-nums text-white/45">{uzs(x.amountUzs)}</p>}
            </div>
          </div>
        ))}
      </Surface>
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={items.length} total={meta?.total ?? 0} />
    </>
  );
}

function SalesList({ qs }: { qs: string }) {
  const t = useTranslations('adm.finance');
  const { money, nf } = useAdminFormat();
  const { items, meta, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Sale, { sales: Sale[]; total: number; nextOffset: number | null }>(`/api/v1/admin/finance/sales?${qs}`, (p) => p.sales);
  if (loading && !meta) return <Spinner />;
  if (error && !meta) return <ErrorState message={error} onRetry={reload} />;
  if (items.length === 0) return <EmptyState>{t('noSales')}</EmptyState>;
  return (
    <>
      <Surface className="divide-y divide-white/[0.06] px-5">
        {items.map((x) => (
          <div key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">{x.customer || '—'}</span>
                <Pill tone="gold">{x.kind === 'PLAN' ? x.plan ?? 'PLAN' : t('credits')}</Pill>
              </div>
              <p className="mt-1 truncate text-xs text-white/55">+{nf.format(x.credits)} · {x.method}{x.reference ? ` · ${x.reference}` : ''}</p>
              <p className="mt-0.5 text-[11px] text-white/35">{dateTime(x.at)} · {x.admin}</p>
            </div>
            <p className="text-sm font-bold tabular-nums text-emerald-300">{money(x.amountMinor, x.currency)}</p>
          </div>
        ))}
      </Surface>
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={items.length} total={meta?.total ?? 0} />
    </>
  );
}
