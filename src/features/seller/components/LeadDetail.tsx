'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Banknote, Calendar, Check, Clock, Loader2, Phone, ShieldCheck, XCircle } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { buttonClasses } from '@/components/ui';

export interface SellerLeadOrder {
  id: string;
  orderNumber: string;
  voucherCode: string;
  customerName: string;
  customerPhone: string;
  totalPriceUSD: number;
  /** What the workshop receives from the platform; null on old orders paid at the workshop. */
  payoutUSD: number | null;
  payoutStatus: 'pending' | 'paid' | 'none';
  payoutPaidAt: string | null;
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  appointmentDate: string;
  note: string;
  createdAt: string;
  items: Array<{ id: string; product_name: string; price: number; quantity: number; product_image_url?: string | null }>;
}

const pad = (n: number) => String(n).padStart(2, '0');
export function formatDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

interface Props {
  order: SellerLeadOrder;
  /** Redeems the voucher. Resolves with an error message, or null on success. */
  onRedeem: (order: SellerLeadOrder) => Promise<string | null>;
}

/** One sold order: buyer, items, the amount the workshop receives, and the hand-over action. */
export function LeadDetail({ order, onRedeem }: Props) {
  const t = useTranslations('sellerOrders');
  const { formatPrice } = useCurrency();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const done = order.status === 'completed';
  const cancelled = order.status === 'cancelled';

  // Reset the confirm step when another order is shown
  React.useEffect(() => {
    setConfirming(false);
    setError(null);
  }, [order.id]);

  const redeem = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onRedeem(order);
    setBusy(false);
    setConfirming(false);
    if (err) setError(err);
  };

  return (
    <article className="rounded-3xl bg-white/[0.04] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-base font-bold text-white">#{order.orderNumber}</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${cancelled ? 'bg-red-500/15 text-red-300' : done ? 'bg-white/10 text-white/70' : 'bg-emerald-500/15 text-emerald-300'}`}>
          {cancelled ? t('statusCancelled') : done ? t('statusAccepted') : t('depositPaid')}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white">{order.customerName}</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-white/50">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(order.appointmentDate)}
          </p>
        </div>
        {order.customerPhone && (
          <a href={`tel:${order.customerPhone}`} className={buttonClasses({ size: 'md' })}>
            <Phone className="h-4 w-4" />
            {order.customerPhone}
          </a>
        )}
      </div>

      <ul className="mt-5 space-y-3">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-black">{it.product_image_url && <img src={it.product_image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{it.product_name}</p>
              <p className="text-xs text-white/45">{t('items', { count: it.quantity })}</p>
            </div>
            <p className="text-sm font-semibold text-white/85">{formatPrice(it.price * it.quantity)}</p>
          </li>
        ))}
      </ul>

      {order.note && <p className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/70">{t('note', { note: order.note })}</p>}

      <dl className="mt-5 space-y-2 rounded-2xl bg-black/30 p-4 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-white/50">{t('total')}</dt><dd className="font-semibold text-white">{formatPrice(order.totalPriceUSD)}</dd></div>
        {order.payoutUSD !== null && !cancelled && (
          <div className="flex justify-between gap-4 pt-2">
            <dt className="font-semibold text-white">{order.payoutStatus === 'paid' ? t('payoutDone') : t('payoutPending')}</dt>
            <dd className="text-lg font-bold text-gold-500">{formatPrice(order.payoutUSD)}</dd>
          </div>
        )}
      </dl>
      {order.payoutUSD !== null && !cancelled && (
        <p className={`mt-3 flex items-start gap-2 text-xs ${order.payoutStatus === 'paid' ? 'text-emerald-300' : 'text-white/55'}`}>
          {order.payoutStatus === 'paid' ? <Banknote className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
          {order.payoutStatus === 'paid'
            ? t('payoutDoneHint', { date: order.payoutPaidAt ? formatDate(order.payoutPaidAt) : '' })
            : t('payoutPendingHint')}
        </p>
      )}
      {cancelled && (
        <p className="mt-3 flex items-start gap-2 text-xs text-red-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('cancelledHint')}
        </p>
      )}

      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {cancelled ? null : done ? (
        <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4" />{t('voucherAccepted')}</p>
      ) : (
        <div className="mt-5 space-y-2">
          {confirming && <p className="text-center text-xs text-amber-300">{t('confirmHint')}</p>}
          <button
            type="button"
            onClick={() => void redeem()}
            disabled={busy}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold transition active:scale-[0.99] disabled:opacity-60 ${confirming ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {confirming ? t('acceptYes') : t('accept')}
          </button>
          {confirming && !busy && <button type="button" onClick={() => setConfirming(false)} className="w-full py-2 text-xs text-white/50 hover:text-white">{t('cancel')}</button>}
        </div>
      )}
    </article>
  );
}
