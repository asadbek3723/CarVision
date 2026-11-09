'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Clock, Loader2, MapPin, Package, Phone, Upload, XCircle } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { compressForUpload, loadImageFromBlob } from '@/features/seller/lib/image-tools';
import { readJson } from '@/lib/safe-json';
import { buttonClasses } from '@/components/ui';

export interface BookingView {
  id: string;
  bookingNumber: string;
  status: 'AWAITING_PAYMENT' | 'PENDING_ADMIN_APPROVAL' | 'UNLOCKED' | 'REDEEMED' | 'REJECTED' | 'CANCELLED';
  totalUSD: number;
  depositUSD: number;
  depositUZS: number;
  rejectedReason: string | null;
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

/** The booked items with the total due at the workshop and the 3% deposit. */
export function BookingItems({ booking, large = false }: { booking: BookingView; large?: boolean }) {
  const t = useTranslations('checkout.booking');
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const thumb = large ? 'h-20 w-20 md:h-24 md:w-24 rounded-2xl' : 'h-12 w-12 rounded-xl';
  return (
    <>
      <ul className={large ? 'space-y-5' : 'mt-4 space-y-3'}>
        {booking.items.map((it, i) => (
          <li key={`${it.name}-${i}`} className="flex items-center gap-4">
            <div className={`${thumb} flex shrink-0 items-center justify-center overflow-hidden bg-white/[0.04]`}>
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = '<span class="text-white/30"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></span>';
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-6 w-6 text-white/30" />
              )}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className={`truncate font-semibold text-white ${large ? 'text-base md:text-lg' : 'text-sm'}`}>{it.name}</p>
              <p className={`mt-0.5 truncate text-white/45 ${large ? 'text-sm' : 'text-[11px]'}`}>{it.brand}{it.quantity > 1 ? ` · ×${it.quantity}` : ''}</p>
            </div>
            <p className={`shrink-0 font-semibold text-white/85 tabular-nums ${large ? 'text-base' : 'text-sm'}`}>{formatPrice(it.unitUSD * it.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className={`flex flex-wrap items-end justify-between gap-3 ${large ? 'mt-8 pt-2' : 'mt-4 pt-4'}`}>
        <div className="min-w-0">
          <p className={`text-white/45 leading-tight ${large ? 'text-sm' : 'text-[11px]'}`}>{t('totalAtWorkshop')}</p>
          <p className={`font-bold text-white tabular-nums tracking-tight ${large ? 'text-2xl md:text-3xl' : 'text-lg'}`}>{formatPrice(booking.totalUSD)}</p>
        </div>
        <div className="min-w-0 text-end">
          <p className={`text-white/45 leading-tight ${large ? 'text-sm' : 'text-[11px]'}`}>{t('deposit')}</p>
          <p className={`font-bold text-gold-500 tabular-nums break-words leading-tight ${large ? 'text-xl sm:text-2xl md:text-3xl' : 'text-base sm:text-lg'}`}>
            {new Intl.NumberFormat(locale, { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(booking.depositUZS)}
          </p>
          <p className={`text-white/40 tabular-nums ${large ? 'text-xs' : 'text-[11px]'}`}>≈ {new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(booking.depositUSD)}</p>
        </div>
      </div>
    </>
  );
}

/** Payment instructions, receipt upload, approval status and (after approval) the workshop. */
export function BookingActions({ booking, payment, onChanged, flat = false }: Props) {
  const t = useTranslations('checkout.booking');
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

  const cancel = async () => {
    if (!window.confirm(t('confirmCancel'))) return;
    const res = await fetch(`/api/v1/bookings/${booking.id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
    else setError(t('errCancel'));
  };

  return (
    <>
      {needsPayment && (
        <div className={`mt-5 space-y-4 ${flat ? '' : 'rounded-2xl bg-white/[0.03] p-4'}`}>
          {booking.status === 'REJECTED' && (
            <p className="flex items-start gap-2 text-xs text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {t('rejectedMessage', { reason: booking.rejectedReason || t('rejectedDefault') })}
            </p>
          )}
          <p className="text-sm font-semibold text-white">{t('step1')}</p>
          {payment.configured ? (
            <div className={flat ? '' : 'rounded-xl bg-black/40 p-4'}>
              <p className="select-all font-mono text-lg tracking-wider text-white">{payment.cardNumber}</p>
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
            <button type="button" onClick={() => void cancel()} className="text-xs text-white/40 underline hover:text-white/70">
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
        <div className={`mt-5 space-y-3 ${flat ? '' : 'rounded-2xl bg-emerald-500/[0.06] p-4'}`}>
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
            <a href={`tel:${booking.workshop.phone}`} className="flex items-center gap-2 text-sm text-white/85 hover:text-white">
              <Phone className="h-4 w-4 text-gold-500" />
              {booking.workshop.phone}
            </a>
          )}
          {booking.workshop.lat !== undefined && booking.workshop.lat !== 0 && (
            <a href={`https://www.google.com/maps?q=${booking.workshop.lat},${booking.workshop.lng}`} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-gold-500 underline">
              {t('openMap')}
            </a>
          )}
          {booking.redemptionCode && (
            <div className={flat ? 'pt-1' : 'rounded-xl bg-black/40 p-3 text-center'}>
              <p className="text-[11px] text-white/50">{t('voucherCode')}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-white">{booking.redemptionCode}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
