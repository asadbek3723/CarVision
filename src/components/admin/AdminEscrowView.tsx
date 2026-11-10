'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { AlertTriangle, Banknote, Check, Clock, Lock, Phone, RotateCcw, Undo2, X } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  Field,
  LoadMore,
  PageHeader,
  Pill,
  SearchField,
  Segmented,
  Sheet,
  Spinner,
  StatTile,
  Surface,
  fieldClass,
  dateTime,
  useAdminApi,
  useAdminFormat,
  useAdminPaged,
  useDebounced,
  useToast,
} from './ui';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  studioName: string;
  studioPhone: string;
  payoutDetails: string | null;
  itemDescription: string;
  totalPriceCents: number;
  /** What the customer transferred (full price; 3% on old deposit-era orders). */
  amountCents: number;
  /** So'm amount the customer was asked to pay (fixed at order time). */
  amountUzs: number | null;
  fxRate: number | null;
  /** So'm amount the admin confirmed when approving. */
  paidAmountUzs: number | null;
  bankReference: string | null;
  commissionCents: number | null;
  payoutCents: number | null;
  payoutStatus: 'NONE' | 'PENDING' | 'PAID' | 'VOID';
  payoutPaidAt: string | null;
  refundCents: number | null;
  refundStatus: 'NONE' | 'PENDING' | 'DONE';
  cancelledAt: string | null;
  handedOver: boolean;
  cancellableUntil: string | null;
  payoutAllowedFrom: string | null;
  transactionRef: string;
  hasReceipt: boolean;
  status: 'pending' | 'verified' | 'rejected' | 'cancelled';
  submittedAt: string;
}

type Queue = 'pending' | 'payouts' | 'refunds' | 'verified' | 'rejected' | 'all';
interface Page {
  orders: Order[];
  total: number;
  nextOffset: number | null;
  counts: Record<Queue, number>;
}
type Transfer = { kind: 'payout_paid' | 'refund_done' | 'refund_rejected'; order: Order };

const TONE = { pending: 'amber', verified: 'green', rejected: 'red', cancelled: 'neutral' } as const;
const needsPayout = (o: Order) => o.payoutStatus === 'PENDING' && o.status === 'verified';
const needsRefund = (o: Order) => o.refundStatus === 'PENDING';
const canRefundRejected = (o: Order) => o.status === 'rejected' && o.refundStatus === 'NONE';
const payoutLocked = (o: Order) => Boolean(o.payoutAllowedFrom && new Date(o.payoutAllowedFrom).getTime() > Date.now());
const digits = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

/** Receipts to check, workshop payouts to transfer and customer refunds to send, all by hand. */
export function AdminEscrowView({ onChanged }: { onChanged?: () => void }) {
  const t = useTranslations('adm.escrow');
  const tc = useTranslations('adm.common');
  const { usd, uzs } = useAdminFormat();
  const api = useAdminApi();
  const toast = useToast();
  const [queue, setQueue] = React.useState<Queue>('pending');
  const [q, setQ] = React.useState('');
  const dq = useDebounced(q);
  const url = `/api/v1/admin/escrow?queue=${queue}${dq.trim() ? `&q=${encodeURIComponent(dq.trim())}` : ''}`;
  const { items: orders, meta, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Order, Page>(url, (p) => p.orders);
  const counts = meta?.counts;

  const [open, setOpen] = React.useState<Order | null>(null);
  const [receipt, setReceipt] = React.useState<{ id: string; url: string | null; loading: boolean } | null>(null);
  const [approveFor, setApproveFor] = React.useState<Order | null>(null);
  const [rejectFor, setRejectFor] = React.useState<Order | null>(null);
  const [transfer, setTransfer] = React.useState<Transfer | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Receipt link is signed on demand (5 minutes), only for the order being looked at.
  React.useEffect(() => {
    if (!open?.hasReceipt) return setReceipt(null);
    let alive = true;
    setReceipt({ id: open.id, url: null, loading: true });
    api<{ url: string }>(`/api/v1/admin/escrow/${open.id}/receipt`)
      .then((d) => alive && setReceipt({ id: open.id, url: d.url, loading: false }))
      .catch(() => alive && setReceipt({ id: open.id, url: null, loading: false }));
    return () => {
      alive = false;
    };
  }, [open, api]);

  const send = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true);
    try {
      await api('/api/v1/admin/escrow', { method: 'PATCH', body: JSON.stringify(body) });
      toast.show(okMessage);
      setOpen(null);
      setApproveFor(null);
      setRejectFor(null);
      setTransfer(null);
      await reload();
      onChanged?.();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('error'), 'err');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !meta) return <Spinner />;
  if (error && !meta) return <ErrorState message={error} onRetry={reload} />;

  const statusPill = (o: Order) =>
    needsRefund(o) ? (
      <Pill tone="amber">{t('refundPending')}</Pill>
    ) : needsPayout(o) ? (
      payoutLocked(o) ? <Pill tone="neutral">{t('payoutWaiting')}</Pill> : <Pill tone="gold">{t('payoutPending')}</Pill>
    ) : (
      <Pill tone={TONE[o.status]}>{t(`status.${o.status}`)}</Pill>
    );

  const actions = (o: Order, large = false) => {
    const size = large ? 'py-3.5 text-sm' : 'py-3 text-xs';
    if (o.status === 'pending') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setRejectFor(o); setOpen(null); }} className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-red-500/15 font-bold text-red-300 hover:bg-red-500/25 ${size}`}><X className="h-4 w-4" />{t('reject')}</button>
          <button type="button" onClick={() => { setApproveFor(o); setOpen(null); }} className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 font-bold text-black hover:brightness-110 ${size}`}><Check className="h-4 w-4" />{t('approve')}</button>
        </div>
      );
    }
    if (needsRefund(o)) {
      return (
        <button type="button" onClick={() => { setTransfer({ kind: 'refund_done', order: o }); setOpen(null); }} className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white/10 font-bold text-white hover:bg-white/15 ${size}`}>
          <RotateCcw className="h-4 w-4" />{t('markRefund', { amount: usd((o.refundCents ?? 0) / 100) })}
        </button>
      );
    }
    if (needsPayout(o)) {
      if (payoutLocked(o)) {
        return (
          <p className={`flex items-center justify-center gap-1.5 rounded-full bg-white/[0.04] text-white/55 ${size}`}>
            <Lock className="h-4 w-4" />{t('payoutLocked', { time: dateTime(o.payoutAllowedFrom!) })}
          </p>
        );
      }
      return (
        <button type="button" onClick={() => { setTransfer({ kind: 'payout_paid', order: o }); setOpen(null); }} className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-500 font-bold text-black hover:brightness-110 ${size}`}>
          <Banknote className="h-4 w-4" />{t('markPayout', { amount: usd((o.payoutCents ?? 0) / 100) })}
        </button>
      );
    }
    if (canRefundRejected(o)) {
      return (
        <button type="button" onClick={() => { setTransfer({ kind: 'refund_rejected', order: o }); setOpen(null); }} className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white/[0.06] font-semibold text-white/80 hover:bg-white/10 ${size}`}>
          <Undo2 className="h-4 w-4" />{t('refundRejected')}
        </button>
      );
    }
    return null;
  };

  const rows = (o: Order) =>
    (
      [
        [t('fCustomer'), o.customerName],
        [t('fWorkshop'), o.studioName],
        [t('fParts'), o.itemDescription],
        [t('fTotal'), usd(o.totalPriceCents / 100)],
        [t('fDeposit'), usd(o.amountCents / 100)],
        o.amountUzs !== null ? [t('fExpectedUzs'), uzs(o.amountUzs)] : null,
        o.paidAmountUzs !== null ? [t('fPaidConfirmed'), uzs(o.paidAmountUzs)] : null,
        o.bankReference ? [t('fBankRef'), o.bankReference] : null,
        o.commissionCents !== null ? [t('fCommission'), usd(o.commissionCents / 100)] : null,
        o.payoutCents !== null ? [t('fPayout'), `${usd(o.payoutCents / 100)} · ${t(`payout.${o.payoutStatus}`)}`] : null,
        o.payoutPaidAt ? [t('fPayoutAt'), dateTime(o.payoutPaidAt)] : null,
        o.cancelledAt ? [t('fCancelledAt'), dateTime(o.cancelledAt)] : null,
        o.refundCents !== null ? [t('fRefund'), `${usd(o.refundCents / 100)} · ${t(`refund.${o.refundStatus}`)}`] : null,
        [t('fHandedOver'), o.handedOver ? t('yes') : t('no')],
        [t('fRef'), o.transactionRef],
      ] as Array<[string, string] | null>
    ).filter((row): row is [string, string] => row !== null);

  return (
    <div>
      {toast.node}
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label={t('statPending')} value={counts?.pending ?? 0} accent={counts?.pending ? 'amber' : undefined} />
        <StatTile label={t('fPayouts')} value={counts?.payouts ?? 0} accent={counts?.payouts ? 'gold' : undefined} />
        <StatTile label={t('statRefunds')} value={counts?.refunds ?? 0} accent={counts?.refunds ? 'amber' : undefined} />
      </div>
      <div className="space-y-3">
        <SearchField value={q} onChange={setQ} placeholder={t('search')} />
        <Segmented
          value={queue}
          onChange={setQueue}
          options={[
            { id: 'pending', label: t('fPending'), count: counts?.pending ?? 0 },
            { id: 'payouts', label: t('fPayouts'), count: counts?.payouts ?? 0 },
            { id: 'refunds', label: t('fRefunds'), count: counts?.refunds ?? 0 },
            { id: 'verified', label: t('fVerified'), count: counts?.verified ?? 0 },
            { id: 'rejected', label: t('fRejected'), count: counts?.rejected ?? 0 },
            { id: 'all', label: tc('all'), count: counts?.all ?? 0 },
          ]}
        />
      </div>

      {error && meta && <div className="mt-4"><ErrorState message={error} onRetry={reload} /></div>}
      <div className={`mt-5 space-y-3 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {orders.length === 0 && !loading && <EmptyState>{queue === 'pending' || queue === 'payouts' || queue === 'refunds' ? t('emptyPending') : t('emptyNone')}</EmptyState>}
        {orders.map((o) => (
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
                <div className="text-end">
                  <p className="text-lg font-bold tabular-nums text-gold-500">{usd(o.amountCents / 100)}</p>
                  {o.amountUzs !== null && <p className="text-[11px] tabular-nums text-white/50">{uzs(o.amountUzs)}</p>}
                </div>
              </div>
              {needsPayout(o) && o.cancellableUntil && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300"><Clock className="h-3.5 w-3.5" />{t('cancelWindow', { time: dateTime(o.cancellableUntil) })}</p>
              )}
            </button>
            {actions(o) && <div className="mt-4">{actions(o)}</div>}
          </Surface>
        ))}
      </div>
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={orders.length} total={meta?.total ?? 0} />

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open ? t('sheetTitle', { number: open.orderNumber }) : ''}>
        {open && (
          <div className="space-y-4">
            {open.hasReceipt ? (
              receipt?.id === open.id && receipt.url ? (
                <a href={receipt.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-black">
                  <img src={receipt.url} alt={t('receiptAlt')} className="max-h-80 w-full object-contain" />
                </a>
              ) : (
                <p className="rounded-2xl bg-white/[0.04] p-4 text-center text-sm text-white/50">{receipt?.loading ? tc('loading') : t('noReceipt')}</p>
              )
            ) : (
              <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-white/50">{t('noReceipt')}</p>
            )}
            <dl className="space-y-2 text-sm">
              {rows(open).map(([k, v]) => (
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

      <ApproveSheet order={approveFor} busy={busy} onClose={() => setApproveFor(null)} onSubmit={(o, paidUzs, reference) =>
        void send({ orderId: o.id, status: 'verified', ...(paidUzs ? { paidUzs } : {}), ...(reference ? { reference } : {}) }, t('toastApproved', { number: o.orderNumber }))
      } />

      <RejectSheet order={rejectFor} busy={busy} onClose={() => setRejectFor(null)} onSubmit={(o, reason) =>
        void send({ orderId: o.id, status: 'rejected', reason }, t('toastRejected', { number: o.orderNumber }))
      } />

      <TransferSheet transfer={transfer} busy={busy} onClose={() => setTransfer(null)} onSubmit={(tr, body) =>
        void send(
          { orderId: tr.order.id, action: tr.kind, ...body },
          tr.kind === 'payout_paid' ? t('toastPayout', { number: tr.order.orderNumber }) : tr.kind === 'refund_done' ? t('toastRefund', { number: tr.order.orderNumber }) : t('toastRefundRejected', { number: tr.order.orderNumber })
        )
      } />
    </div>
  );
}

/** Approval: the admin confirms the so'm amount on the receipt and its bank transaction id. */
function ApproveSheet({ order, busy, onClose, onSubmit }: { order: Order | null; busy: boolean; onClose: () => void; onSubmit: (o: Order, paidUzs: number | null, reference: string) => void }) {
  const t = useTranslations('adm.escrow');
  const tc = useTranslations('adm.common');
  const { uzs } = useAdminFormat();
  const [paid, setPaid] = React.useState('');
  const [reference, setReference] = React.useState('');
  React.useEffect(() => {
    setPaid(order?.amountUzs ? String(order.amountUzs) : '');
    setReference('');
  }, [order]);
  if (!order) return null;
  const paidNum = digits(paid);
  const mismatch = order.amountUzs !== null && paidNum > 0 && paidNum !== order.amountUzs;
  return (
    <Sheet open onClose={onClose} title={t('approveTitle', { number: order.orderNumber })}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(order, paidNum || null, reference.trim()); }} className="space-y-4">
        {order.amountUzs !== null && <p className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/75">{t('expectedUzs', { amount: uzs(order.amountUzs) })}</p>}
        <Field label={t('fPaidUzs')}>
          <input inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={fieldClass} />
        </Field>
        {mismatch && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('amountMismatch', { diff: uzs(paidNum - (order.amountUzs ?? 0)) })}</p>
        )}
        <Field label={t('fBankRef')}>
          <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder={t('bankRefPlaceholder')} className={fieldClass} />
        </Field>
        <p className="text-xs text-white/45">{t('approveHint')}</p>
        <button type="submit" disabled={busy} className="w-full rounded-full bg-emerald-500 py-3.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60">
          {busy ? tc('saving') : t('approveConfirm')}
        </button>
      </form>
    </Sheet>
  );
}

function RejectSheet({ order, busy, onClose, onSubmit }: { order: Order | null; busy: boolean; onClose: () => void; onSubmit: (o: Order, reason: string) => void }) {
  const t = useTranslations('adm.escrow');
  const tc = useTranslations('adm.common');
  const [reason, setReason] = React.useState('');
  React.useEffect(() => setReason(''), [order]);
  return (
    <Sheet open={Boolean(order)} onClose={onClose} title={t('reasonTitle')}>
      <div className="space-y-4">
        <Field label={t('reasonLabel')}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t('reasonPlaceholder')} className={fieldClass} />
        </Field>
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => order && onSubmit(order, reason.trim())} className="w-full rounded-full bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? tc('saving') : t('reject')}
        </button>
      </div>
    </Sheet>
  );
}

/** Records a manual bank transfer: what was sent and the bank's transaction id. */
function TransferSheet({ transfer, busy, onClose, onSubmit }: { transfer: Transfer | null; busy: boolean; onClose: () => void; onSubmit: (tr: Transfer, body: Record<string, unknown>) => void }) {
  const t = useTranslations('adm.escrow');
  const tc = useTranslations('adm.common');
  const { usd, uzs } = useAdminFormat();
  const [reference, setReference] = React.useState('');
  const [amountUzs, setAmountUzs] = React.useState('');
  const [amountUsd, setAmountUsd] = React.useState('');
  const o = transfer?.order;
  const cents = !transfer || !o ? 0 : transfer.kind === 'payout_paid' ? o.payoutCents ?? 0 : transfer.kind === 'refund_done' ? o.refundCents ?? 0 : o.amountCents;

  React.useEffect(() => {
    setReference('');
    setAmountUsd(cents ? (cents / 100).toFixed(2) : '');
    // Same rate as the order, so the so'm figure matches what the customer actually paid.
    setAmountUzs(o?.fxRate ? String(Math.round((cents / 100) * o.fxRate)) : '');
  }, [transfer, o, cents]);

  if (!transfer || !o) return null;
  const title = transfer.kind === 'payout_paid' ? t('payoutTitle', { number: o.orderNumber }) : transfer.kind === 'refund_done' ? t('refundTitle', { number: o.orderNumber }) : t('refundRejectedTitle', { number: o.orderNumber });
  const usdCents = Math.round((Number(amountUsd.replace(',', '.')) || 0) * 100);
  const valid = reference.trim().length >= 2 && (transfer.kind !== 'refund_rejected' || (usdCents > 0 && usdCents <= o.amountCents));

  return (
    <Sheet open onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const uz = digits(amountUzs);
          onSubmit(transfer, {
            reference: reference.trim(),
            ...(uz ? { amountUzs: uz } : {}),
            ...(transfer.kind === 'refund_rejected' ? { amountCents: usdCents } : {}),
          });
        }}
        className="space-y-4"
      >
        <dl className="space-y-2 rounded-2xl bg-white/[0.04] p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-white/50">{transfer.kind === 'payout_paid' ? t('fWorkshop') : t('fCustomer')}</dt><dd className="text-end font-semibold text-white">{transfer.kind === 'payout_paid' ? o.studioName : `${o.customerName} · ${o.customerPhone}`}</dd></div>
          {transfer.kind !== 'refund_rejected' && <div className="flex justify-between gap-4"><dt className="text-white/50">{t('fAmount')}</dt><dd className="font-bold text-gold-500">{usd(cents / 100)}{o.fxRate ? ` · ${uzs(Math.round((cents / 100) * o.fxRate))}` : ''}</dd></div>}
          {transfer.kind === 'payout_paid' && (
            <div className="flex justify-between gap-4"><dt className="text-white/50">{t('fPayoutDetails')}</dt><dd className="text-end font-mono text-xs text-white">{o.payoutDetails || t('noPayoutDetails')}</dd></div>
          )}
        </dl>
        {transfer.kind === 'refund_rejected' && (
          <Field label={t('fRefundAmount')}>
            <input inputMode="decimal" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} className={fieldClass} />
          </Field>
        )}
        <Field label={t('fTransferUzs')}>
          <input inputMode="numeric" value={amountUzs} onChange={(e) => setAmountUzs(e.target.value)} placeholder="0" className={fieldClass} />
        </Field>
        <Field label={t('fTransferRef')}>
          <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder={t('transferRefPlaceholder')} className={fieldClass} required />
        </Field>
        <p className="text-xs text-white/45">{t('transferHint')}</p>
        <button type="submit" disabled={busy || !valid} className="w-full rounded-full bg-gold-500 py-3.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
          {busy ? tc('saving') : t('transferConfirm')}
        </button>
      </form>
    </Sheet>
  );
}
