'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Clock, Loader2, MapPin, Phone, Upload, XCircle } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { compressForUpload, loadImageFromBlob } from '@/features/seller/lib/image-tools';
import { readJson } from '@/lib/safe-json';
import { buttonClasses } from '@/components/ui';

export interface BookingView {
  id: string;
  bookingNumber: string;
  status: 'AWAITING_PAYMENT' | 'PENDING_ADMIN_APPROVAL' | 'UNLOCKED' | 'REDEEMED' | 'REJECTED' | 'CANCELLED';
  totalUSD: number;
  /** Amount to transfer (the full price) in USD and so'm. */
  payUSD: number;
  payUZS: number;
  rejectedReason: string | null;
  cancellableUntil: string | null;
  refundUSD: number | null;
  refundDone: boolean;
  items: Array<{ name: string; brand: string; image: string | null; unitUSD: number; quantity: number }>;
  workshop: { label: string; unlocked: boolean; name?: string; phone?: string; address?: string; lat?: number; lng?: number };
  redemptionCode: string | null;
  createdAt: string;
}

export interface PaymentInfo {
  configured: boolean;
  cardNumber?: string;
  holder?: string;
  bank?: string;
}

export const BOOKING_STATUS_STYLE: Record<BookingView['status'], { key: string; cls: string; text: string; dot: string }> = {
  AWAITING_PAYMENT: { key: 'statusAwaiting', cls: 'bg-amber-500/15 text-amber-300', text: 'text-amber-300', dot: 'bg-amber-300' },
  PENDING_ADMIN_APPROVAL: { key: 'statusPending', cls: 'bg-sky-500/15 text-sky-300', text: 'text-sky-300', dot: 'bg-sky-300' },
  UNLOCKED: { key: 'statusUnlocked', cls: 'bg-emerald-500/15 text-emerald-300', text: 'text-emerald-300', dot: 'bg-emerald-300' },
  REDEEMED: { key: 'statusRedeemed', cls: 'bg-white/10 text-white/70', text: 'text-white/70', dot: 'bg-white/70' },
  REJECTED: { key: 'statusRejected', cls: 'bg-red-500/15 text-red-300', text: 'text-red-300', dot: 'bg-red-300' },
  CANCELLED: { key: 'statusCancelled', cls: 'bg-white/10 text-white/50', text: 'text-white/50', dot: 'bg-white/40' },
};

interface Props {
  booking: BookingView;
  payment: PaymentInfo;
  onChanged: () => void;
  /** No card surface or inner boxes: for pages that separate items by whitespace. */
  flat?: boolean;
}

/** One booking as a card (checkout): number, status, items, totals and the actions below. */
export function BookingCard({ booking, payment, onChanged, flat = false }: Props) {
  const t = useTranslations('checkout.booking');
  const status = BOOKING_STATUS_STYLE[booking.status];
  return (
    <article className={flat ? 'py-2' : 'rounded-3xl bg-surface-1 p-5'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-white">#{booking.bookingNumber}</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.cls}`}>{t(status.key)}</span>
      </div>
      <BookingItems booking={booking} />
      <BookingActions booking={booking} payment={payment} onChanged={onChanged} flat={flat} />
    </article>
  );
}

/** The ordered items with the order total. */
export function BookingItems({ booking, large = false }: { booking: BookingView; large?: boolean }) {
  const t = useTranslations('checkout.booking');
  const { formatPrice } = useCurrency();
  const thumb = large ? 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-xl sm:rounded-2xl' : 'h-12 w-12 rounded-xl';
  return (
    <>
      <ul className={large ? 'divide-y divide-white/[0.06] sm:divide-y-0 sm:space-y-5' : 'mt-4 space-y-3'}>
        {booking.items.map((it, i) => (
          <li key={`${it.name}-${i}`} className={`flex items-center gap-3 sm:gap-4 ${large ? 'py-3 first:pt-0 last:pb-0 sm:py-0' : ''}`}>
            <div className={`${thumb} shrink-0 overflow-hidden bg-black`}>{it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold text-white ${large ? 'line-clamp-2 text-[15px] leading-snug sm:truncate sm:text-base md:text-lg' : 'truncate text-sm'}`}>{it.name}</p>
              <p className={`text-white/45 ${large ? 'text-sm' : 'text-[11px]'}`}>{it.brand}{it.quantity > 1 ? ` · ×${it.quantity}` : ''}</p>
            </div>
            <p className={`shrink-0 whitespace-nowrap font-semibold tabular-nums text-white/85 ${large ? 'text-sm sm:text-base' : 'text-sm'}`}>{formatPrice(it.unitUSD * it.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className={`flex items-end justify-between gap-4 ${large ? 'mt-5 rounded-2xl bg-white/[0.04] p-4 sm:mt-8 sm:rounded-none sm:bg-transparent sm:p-0 sm:pt-2' : 'mt-4 pt-4'}`}>
        <p className={`text-white/55 ${large ? 'text-sm sm:text-base' : 'text-sm'}`}>{t('total')}</p>
        <p className={`font-bold tabular-nums text-gold-500 ${large ? 'text-xl sm:text-2xl md:text-3xl' : 'text-lg'}`}>{formatPrice(booking.totalUSD)}</p>
      </div>
    </>
  );
}

/** Payment instructions, receipt upload, approval status and (after approval) the pickup place. */
export function BookingActions({ booking, payment, onChanged, flat = false }: Props) {
  const t = useTranslations('checkout.booking');
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const apiError = useApiError();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const needsPayment = booking.status === 'AWAITING_PAYMENT' || booking.status === 'REJECTED';

  // While the admin is reviewing, check again every 10 seconds
  React.useEffect(() => {
    if (booking.status !== 'PENDING_ADMIN_APPROVAL') return;
    const timer = setInterval(onChanged, 10_000);
    return () => clearInterval(timer);
  }, [booking.status, onChanged]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const img = await loadImageFromBlob(file);
      const blob = await compressForUpload(img);
      const form = new FormData();
      form.append('file', new File([blob], 'receipt.jpg', { type: 'image/jpeg' }));
      const res = await fetch(`/api/v1/bookings/${booking.id}/receipt`, { method: 'POST', body: form });
      const data = (await readJson(res)).data;
      if (!res.ok || !data.success) throw new Error(apiError(data, t('errUpload')));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errUpload'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cancel = async (paid: boolean) => {
    const question = paid && booking.refundUSD !== null ? t('confirmCancelPaid', { amount: formatPrice(booking.refundUSD) }) : t('confirmCancel');
    if (!window.confirm(question)) return;
    setError(null);
    const res = await fetch(`/api/v1/bookings/${booking.id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
    else setError(apiError((await readJson(res)).data, t('errCancel')));
  };

  // A paid order can be cancelled only for a short while; hide the link once that time is over.
  const [canCancelPaid, setCanCancelPaid] = React.useState(false);
  React.useEffect(() => {
    if (!booking.cancellableUntil) {
      setCanCancelPaid(false);
      return;
    }
    const left = new Date(booking.cancellableUntil).getTime() - Date.now();
    setCanCancelPaid(left > 0);
    if (left <= 0) return;
    const timer = setTimeout(() => setCanCancelPaid(false), Math.min(left, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [booking.cancellableUntil]);

  const uzs = new Intl.NumberFormat(locale, { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(booking.payUZS);

  return (
    <>
      {needsPayment && (
        <div className={`mt-5 space-y-4 ${flat ? 'rounded-2xl bg-white/[0.03] p-4 sm:rounded-none sm:bg-transparent sm:p-0' : 'rounded-2xl bg-white/[0.03] p-4'}`}>
          {booking.status === 'REJECTED' && (
            <p className="flex items-start gap-2 text-xs text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {t('rejectedMessage', { reason: booking.rejectedReason || t('rejectedDefault') })}
            </p>
          )}
          <p className="text-sm font-semibold text-white">{t('step1')}</p>
          <div>
            <p className="text-[11px] text-white/45">{t('amountToPay')}</p>
            <p className="select-all font-display text-2xl font-semibold tabular-nums text-gold-500">{uzs}</p>
            <p className="text-[11px] text-white/40">≈ {new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(booking.payUSD)}</p>
          </div>
          {payment.configured ? (
            <div className={flat ? '' : 'rounded-xl bg-black/40 p-4'}>
              <p className="select-all break-all font-mono text-base tracking-wider text-white sm:text-lg">{payment.cardNumber}</p>
              <p className="mt-1 text-xs text-white/60">{payment.holder}{payment.bank ? ` · ${payment.bank}` : ''}</p>
              <p className="mt-3 text-xs text-amber-300">{t.rich('commentHint', { number: booking.bookingNumber, b: (c) => <span className="font-mono font-bold">{c}</span> })}</p>
            </div>
          ) : (
            <p className={`text-xs text-amber-200 ${flat ? '' : 'rounded-xl bg-amber-500/10 p-4'}`}>{t('notConfigured')}</p>
          )}

          <p className="text-sm font-semibold text-white">{t('step2')}</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          <button
            type="button"
            disabled={uploading || !payment.configured}
            onClick={() => fileRef.current?.click()}
            className={buttonClasses({ size: 'md', fullWidth: true })}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? t('sending') : t('send')}
          </button>
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          {booking.status === 'AWAITING_PAYMENT' && (
            <button type="button" onClick={() => void cancel(false)} className="min-h-11 text-xs text-white/40 underline hover:text-white/70 sm:min-h-0">
              {t('cancelLink')}
            </button>
          )}
        </div>
      )}

      {booking.status === 'PENDING_ADMIN_APPROVAL' && (
        <p className={`mt-5 flex items-start gap-2 text-xs text-sky-200 ${flat ? '' : 'rounded-2xl bg-sky-500/10 p-4'}`}>
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          {t('pendingNote')}
        </p>
      )}

      {booking.workshop.unlocked && (
        <div className={`mt-5 space-y-3 ${flat ? 'rounded-2xl bg-emerald-500/[0.06] p-4 sm:rounded-none sm:bg-transparent sm:p-0' : 'rounded-2xl bg-emerald-500/[0.06] p-4'}`}>
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <Check className="h-4 w-4" />
            {t('unlockedTitle')}
          </p>
          <p className="text-base font-bold text-white">{booking.workshop.name}</p>
          {booking.workshop.address && (
            <p className="flex items-start gap-2 text-sm text-white/75">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              {booking.workshop.address}
            </p>
          )}
          {booking.workshop.phone && (
            <a href={`tel:${booking.workshop.phone}`} className="flex min-h-11 items-center gap-2 text-sm text-white/85 hover:text-white sm:min-h-0">
              <Phone className="h-4 w-4 text-gold-500" />
              {booking.workshop.phone}
            </a>
          )}
          {booking.workshop.lat !== undefined && booking.workshop.lat !== 0 && (
            <a href={`https://www.google.com/maps?q=${booking.workshop.lat},${booking.workshop.lng}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-xs font-semibold text-gold-500 underline sm:min-h-0">
              {t('openMap')}
            </a>
          )}
          {booking.redemptionCode && (
            <div className={flat ? 'pt-1' : 'rounded-xl bg-black/40 p-3 text-center'}>
              <p className="text-[11px] text-white/50">{t('voucherCode')}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-white">{booking.redemptionCode}</p>
            </div>
          )}
          {canCancelPaid && booking.status === 'UNLOCKED' && (
            <button type="button" onClick={() => void cancel(true)} className="min-h-11 text-xs text-white/35 underline hover:text-white/60 sm:min-h-0">
              {t('cancelOrder')}
            </button>
          )}
        </div>
      )}

      {booking.status === 'CANCELLED' && booking.refundUSD !== null && booking.refundUSD > 0 && (
        <p className={`mt-5 flex items-start gap-2 text-xs ${booking.refundDone ? 'text-emerald-300' : 'text-white/60'} ${flat ? '' : 'rounded-2xl bg-white/[0.04] p-4'}`}>
          {booking.refundDone ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
          {booking.refundDone ? t('refundDone', { amount: formatPrice(booking.refundUSD) }) : t('refundPending', { amount: formatPrice(booking.refundUSD) })}
        </p>
      )}

      {error && !needsPayment && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    </>
  );
}
