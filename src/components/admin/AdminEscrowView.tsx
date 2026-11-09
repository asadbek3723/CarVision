'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Banknote, Check, Clock, Phone, RotateCcw, X } from 'lucide-react';
import { EmptyState, ErrorState, Field, PageHeader, Pill, SearchField, Segmented, Sheet, Spinner, StatTile, Surface, fieldClass, dateTime, useAdminApi, useAdminData, useAdminFormat, useToast } from './ui';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  studioName: string;
  studioPhone: string;
  itemDescription: string;
  totalPriceCents: number;
  /** What the customer transferred (full price; 3% on old deposit-era orders). */
  amountCents: number;
  /** null on old deposit-era orders */
  commissionCents: number | null;
  payoutCents: number | null;
  payoutStatus: 'NONE' | 'PENDING' | 'PAID' | 'VOID';
  payoutPaidAt: string | null;
  refundCents: number | null;
  refundStatus: 'NONE' | 'PENDING' | 'DONE';
  cancelledAt: string | null;
  handedOver: boolean;
  cancellableUntil: string | null;
  transactionRef: string;
  status: 'pending' | 'verified' | 'rejected' | 'cancelled';
  submittedAt: string;
  receiptUrl: string | null;
}

type Filter = 'pending' | 'payouts' | 'refunds' | 'verified' | 'rejected' | 'all';
const TONE = { pending: 'amber', verified: 'green', rejected: 'red', cancelled: 'neutral' } as const;

const needsPayout = (o: Order) => o.payoutStatus === 'PENDING' && o.status === 'verified';
const needsRefund = (o: Order) => o.refundStatus === 'PENDING';

/** Receipts to check, workshop payouts to transfer and customer refunds to send, all by hand. */
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
  const match: Record<Filter, (o: Order) => boolean> = {
    pending: (o) => o.status === 'pending',
    payouts: needsPayout,
    refunds: needsRefund,
    verified: (o) => o.status === 'verified',
    rejected: (o) => o.status === 'rejected',
    all: () => true,
  };
  const counts = Object.fromEntries((Object.keys(match) as Filter[]).map((f) => [f, orders.filter(match[f]).length])) as Record<Filter, number>;
  const commission = orders.filter((o) => o.status === 'verified').reduce((s, o) => s + (o.commissionCents ?? 0), 0) / 100;
  const owed = orders.filter(needsPayout).reduce((s, o) => s + (o.payoutCents ?? 0), 0) / 100;
  const needle = q.trim().toLowerCase();
  const list = orders.filter((o) => match[filter](o) && (!needle || `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.studioName}`.toLowerCase().includes(needle)));

  const send = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true);
    try {
      await api('/api/v1/admin/escrow', { method: 'PATCH', body: JSON.stringify(body) });
      toast.show(okMessage);
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
  const review = (o: Order, status: 'verified' | 'rejected', why?: string) =>
    send({ orderId: o.id, status, reason: why }, status === 'verified' ? t('toastApproved', { number: o.orderNumber }) : t('toastRejected', { number: o.orderNumber }));
  const markPayout = (o: Order) => {
    // Paying out while the customer can still cancel risks paying the workshop for a refunded order.
    if (o.cancellableUntil && !window.confirm(t('payoutEarlyConfirm', { time: dateTime(o.cancellableUntil) }))) return;
    void send({ orderId: o.id, action: 'payout_paid' }, t('toastPayout', { number: o.orderNumber }));
  };
  const markRefund = (o: Order) => void send({ orderId: o.id, action: 'refund_done' }, t('toastRefund', { number: o.orderNumber }));

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const statusPill = (o: Order) =>
    needsRefund(o) ? (
      <Pill tone="amber">{t('refundPending')}</Pill>
    ) : needsPayout(o) ? (
      <Pill tone="gold">{t('payoutPending')}</Pill>
    ) : (
      <Pill tone={TONE[o.status]}>{t(`status.${o.status}`)}</Pill>
    );

  const actions = (o: Order, large = false) => {
    const size = large ? 'py-3.5 text-sm' : 'py-3 text-xs';
    if (o.status === 'pending') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setReason(''); setReasonFor(o); setOpen(null); }} className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-red-500/15 font-bold text-red-300 hover:bg-red-500/25 ${size}`}><X className="h-4 w-4" />{t('reject')}</button>
          <button type="button" disabled={busy} onClick={() => void review(o, 'verified')} className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 font-bold text-black hover:brightness-110 disabled:opacity-60 ${size}`}><Check className="h-4 w-4" />{t('approve')}</button>
        </div>
      );
    }
    if (needsRefund(o)) {
      return (
        <button type="button" disabled={busy} onClick={() => markRefund(o)} className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white/10 font-bold text-white hover:bg-white/15 disabled:opacity-60 ${size}`}>
          <RotateCcw className="h-4 w-4" />{t('markRefund', { amount: usd((o.refundCents ?? 0) / 100) })}
        </button>
      );
    }
    if (needsPayout(o)) {
      return (
        <button type="button" disabled={busy} onClick={() => markPayout(o)} className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-500 font-bold text-black hover:brightness-110 disabled:opacity-60 ${size}`}>
          <Banknote className="h-4 w-4" />{t('markPayout', { amount: usd((o.payoutCents ?? 0) / 100) })}
        </button>
      );
    }
    return null;
  };

  return (
    <div>
      {toast.node}
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('statPending')} value={counts.pending} accent={counts.pending ? 'amber' : undefined} />
        <StatTile label={t('statApproved')} value={usd(commission)} accent="green" />
        <StatTile label={t('statOwed')} value={usd(owed)} hint={t('statOwedHint', { count: counts.payouts })} accent={owed ? 'gold' : undefined} />
        <StatTile label={t('statRefunds')} value={counts.refunds} accent={counts.refunds ? 'amber' : undefined} />
      </div>
      <div className="space-y-3">
        <SearchField value={q} onChange={setQ} placeholder={t('search')} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'pending', label: t('fPending'), count: counts.pending },
            { id: 'payouts', label: t('fPayouts'), count: counts.payouts },
            { id: 'refunds', label: t('fRefunds'), count: counts.refunds },
            { id: 'verified', label: t('fVerified'), count: counts.verified },
            { id: 'rejected', label: t('fRejected'), count: counts.rejected },
            { id: 'all', label: tc('all'), count: counts.all },
          ]}
        />
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 && <EmptyState>{filter === 'pending' || filter === 'payouts' || filter === 'refunds' ? t('emptyPending') : t('emptyNone')}</EmptyState>}
        {list.map((o) => (
          <Surface key={o.id} className="p-4 sm:p-5">
            <button type="button" onClick={() => setOpen(o)} className="block w-full text-start">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-white">#{o.orderNumber}</p>
                {statusPill(o)}
              </div>
              <p className="mt-2 text-sm text-white/80">{o.customerName} → <span className="text-white/60">{o.studioName}</span></p>
              <p className="mt-1 truncate text-xs text-white/45">{o.itemDescription}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-xs text-white/40">{dateTime(o.submittedAt)}</p>
                <p className="text-lg font-bold tabular-nums text-gold-500">{usd(o.amountCents / 100)}</p>
              </div>
              {needsPayout(o) && o.cancellableUntil && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300"><Clock className="h-3.5 w-3.5" />{t('cancelWindow', { time: dateTime(o.cancellableUntil) })}</p>
              )}
            </button>
            {actions(o) && <div className="mt-4">{actions(o)}</div>}
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
              {(
                [
                  [t('fCustomer'), open.customerName],
                  [t('fWorkshop'), open.studioName],
                  [t('fParts'), open.itemDescription],
                  [t('fTotal'), usd(open.totalPriceCents / 100)],
                  [t('fDeposit'), usd(open.amountCents / 100)],
                  open.commissionCents !== null ? [t('fCommission'), usd(open.commissionCents / 100)] : null,
                  open.payoutCents !== null ? [t('fPayout'), `${usd(open.payoutCents / 100)} · ${t(`payout.${open.payoutStatus}`)}`] : null,
                  open.payoutPaidAt ? [t('fPayoutAt'), dateTime(open.payoutPaidAt)] : null,
                  open.cancelledAt ? [t('fCancelledAt'), dateTime(open.cancelledAt)] : null,
                  open.refundCents !== null ? [t('fRefund'), `${usd(open.refundCents / 100)} · ${t(`refund.${open.refundStatus}`)}`] : null,
                  [t('fHandedOver'), open.handedOver ? t('yes') : t('no')],
                  [t('fRef'), open.transactionRef],
                ] as Array<[string, string] | null>
              )
                .filter((row): row is [string, string] => row !== null)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="text-white/45">{k}</dt><dd className="text-end font-semibold text-white">{v}</dd></div>
                ))}
            </dl>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${open.customerPhone}`} className="flex flex-col items-center justify-center rounded-2xl bg-white/10 px-3 py-2.5 text-center hover:bg-white/15">
                <span className="text-[11px] text-white/50">{t('fCustomer')}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white"><Phone className="h-3.5 w-3.5" />{open.customerPhone}</span>
              </a>
              {open.studioPhone ? (
                <a href={`tel:${open.studioPhone}`} className="flex flex-col items-center justify-center rounded-2xl bg-white/10 px-3 py-2.5 text-center hover:bg-white/15">
                  <span className="text-[11px] text-white/50">{t('fWorkshop')}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white"><Phone className="h-3.5 w-3.5" />{open.studioPhone}</span>
                </a>
              ) : <span />}
            </div>
            {needsPayout(open) && open.cancellableUntil && (
              <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-200"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{t('cancelWindow', { time: dateTime(open.cancellableUntil) })}</p>
            )}
            {actions(open, true)}
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
