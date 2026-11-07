'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Check, Phone, X } from 'lucide-react';
import { EmptyState, ErrorState, Field, PageHeader, Pill, SearchField, Segmented, Sheet, Spinner, StatTile, Surface, fieldClass, dateTime, useAdminApi, useAdminData, useAdminFormat, useToast } from './ui';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  studioName: string;
  itemDescription: string;
  totalPriceCents: number;
  depositCents: number;
  transactionRef: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: string;
  receiptUrl: string | null;
}

type Filter = 'pending' | 'verified' | 'rejected' | 'all';
const TONE = { pending: 'amber', verified: 'green', rejected: 'red' } as const;

export function AdminEscrowView({ onChanged }: { onChanged?: () => void }) {
  const t = useTranslations('adm.escrow');
  const tc = useTranslations('adm.common');
  const { usd } = useAdminFormat();
  const { data, error, loading, reload } = useAdminData<{ orders: Order[] }>('/api/v1/admin/escrow');
  const api = useAdminApi();
  const toast = useToast();
  const [filter, setFilter] = React.useState<Filter>('pending');
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState<Order | null>(null);
  const [reasonFor, setReasonFor] = React.useState<Order | null>(null);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const orders = data?.orders ?? [];
  const counts = { pending: orders.filter((o) => o.status === 'pending').length, verified: orders.filter((o) => o.status === 'verified').length, rejected: orders.filter((o) => o.status === 'rejected').length, all: orders.length };
  const approved = orders.filter((o) => o.status === 'verified').reduce((s, o) => s + o.depositCents, 0) / 100;
  const needle = q.trim().toLowerCase();
  const list = orders.filter((o) => (filter === 'all' || o.status === filter) && (!needle || `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.studioName}`.toLowerCase().includes(needle)));

  const review = async (o: Order, status: 'verified' | 'rejected', why?: string) => {
    setBusy(true);
    try {
      await api('/api/v1/admin/escrow', { method: 'PATCH', body: JSON.stringify({ orderId: o.id, status, reason: why }) });
      toast.show(status === 'verified' ? t('toastApproved', { number: o.orderNumber }) : t('toastRejected', { number: o.orderNumber }));
      setOpen(null);
      setReasonFor(null);
      await reload();
      onChanged?.();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('error'), 'err');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      {toast.node}
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t('statPending')} value={counts.pending} accent={counts.pending ? 'amber' : undefined} />
        <StatTile label={t('statApproved')} value={usd(approved)} accent="green" />
        <StatTile label={t('statRejected')} value={counts.rejected} />
      </div>
      <div className="space-y-3">
        <SearchField value={q} onChange={setQ} placeholder={t('search')} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'pending', label: t('fPending'), count: counts.pending },
            { id: 'verified', label: t('fVerified'), count: counts.verified },
            { id: 'rejected', label: t('fRejected'), count: counts.rejected },
            { id: 'all', label: tc('all'), count: counts.all },
          ]}
        />
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 && <EmptyState>{filter === 'pending' ? t('emptyPending') : t('emptyNone')}</EmptyState>}
        {list.map((o) => (
          <Surface key={o.id} className="p-4 sm:p-5">
            <button type="button" onClick={() => setOpen(o)} className="block w-full text-start">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-white">#{o.orderNumber}</p>
                <Pill tone={TONE[o.status]}>{t(`status.${o.status}`)}</Pill>
              </div>
              <p className="mt-2 text-sm text-white/80">{o.customerName} → <span className="text-white/60">{o.studioName}</span></p>
              <p className="mt-1 truncate text-xs text-white/45">{o.itemDescription}</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-xs text-white/40">{dateTime(o.submittedAt)}</p>
                <p className="text-lg font-bold text-gold-500">{usd(o.depositCents / 100)}</p>
              </div>
            </button>
            {o.status === 'pending' && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setReason(''); setReasonFor(o); }} className="rounded-full bg-red-500/15 py-3 text-xs font-bold text-red-300 hover:bg-red-500/25">{t('reject')}</button>
                <button type="button" disabled={busy} onClick={() => void review(o, 'verified')} className="rounded-full bg-emerald-500 py-3 text-xs font-bold text-black hover:brightness-110 disabled:opacity-60">{t('approve')}</button>
              </div>
            )}
          </Surface>
        ))}
      </div>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open ? t('sheetTitle', { number: open.orderNumber }) : ''}>
        {open && (
          <div className="space-y-4">
            {open.receiptUrl ? (
              <a href={open.receiptUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-black">
                <img src={open.receiptUrl} alt={t('receiptAlt')} className="max-h-80 w-full object-contain" />
              </a>
            ) : (
              <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-white/50">{t('noReceipt')}</p>
            )}
            <dl className="space-y-2 text-sm">
              {[
                [t('fCustomer'), open.customerName],
                [t('fWorkshop'), open.studioName],
                [t('fParts'), open.itemDescription],
                [t('fTotal'), usd(open.totalPriceCents / 100)],
                [t('fDeposit'), usd(open.depositCents / 100)],
                [t('fRef'), open.transactionRef],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-white/45">{k}</dt><dd className="text-end font-semibold text-white">{v}</dd></div>
              ))}
            </dl>
            <a href={`tel:${open.customerPhone}`} className="flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15"><Phone className="h-4 w-4" />{open.customerPhone}</a>
            {open.status === 'pending' && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setReason(''); setReasonFor(open); setOpen(null); }} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-500/15 py-3.5 text-sm font-bold text-red-300"><X className="h-4 w-4" />{t('reject')}</button>
                <button type="button" disabled={busy} onClick={() => void review(open, 'verified')} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 py-3.5 text-sm font-bold text-black disabled:opacity-60"><Check className="h-4 w-4" />{t('approve')}</button>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={Boolean(reasonFor)} onClose={() => setReasonFor(null)} title={t('reasonTitle')}>
        <div className="space-y-4">
          <Field label={t('reasonLabel')}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t('reasonPlaceholder')} className={fieldClass} />
          </Field>
          <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => reasonFor && void review(reasonFor, 'rejected', reason.trim())} className="w-full rounded-full bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? tc('saving') : t('reject')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
