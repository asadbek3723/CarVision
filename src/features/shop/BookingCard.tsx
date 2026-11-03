'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Clock, Loader2, MapPin, Phone, Upload, XCircle } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { compressForUpload, loadImageFromBlob } from '@/features/seller/lib/image-tools';

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

const STATUS_STYLE: Record<BookingView['status'], { key: string; cls: string }> = {
  AWAITING_PAYMENT: { key: 'statusAwaiting', cls: 'bg-amber-500/15 text-amber-300' },
  PENDING_ADMIN_APPROVAL: { key: 'statusPending', cls: 'bg-sky-500/15 text-sky-300' },
  UNLOCKED: { key: 'statusUnlocked', cls: 'bg-emerald-500/15 text-emerald-300' },
  REDEEMED: { key: 'statusRedeemed', cls: 'bg-white/10 text-white/70' },
  REJECTED: { key: 'statusRejected', cls: 'bg-red-500/15 text-red-300' },
  CANCELLED: { key: 'statusCancelled', cls: 'bg-white/10 text-white/50' },
};

interface Props {
  booking: BookingView;
  payment: PaymentInfo;
  onChanged: () => void;
}

/** One booking: payment instructions, receipt upload, approval status and (after approval) the workshop. */
export function BookingCard({ booking, payment, onChanged }: Props) {
  const t = useTranslations('checkout.booking');
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const status = STATUS_STYLE[booking.status];
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || t('errUpload'));
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
    <article className="rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-white">#{booking.bookingNumber}</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.cls}`}>{t(status.key)}</span>
      </div>

      <ul className="mt-4 space-y-3">
        {booking.items.map((it, i) => (
          <li key={`${it.name}-${i}`} className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black">{it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{it.name}</p>
              <p className="text-[11px] text-white/45">{it.brand}{it.quantity > 1 ? ` · ×${it.quantity}` : ''}</p>
            </div>
            <p className="text-sm font-semibold text-white/85">{formatPrice(it.unitUSD * it.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
        <div>
          <p className="text-[11px] text-white/45">{t('totalAtWorkshop')}</p>
          <p className="text-lg font-bold text-white">{formatPrice(booking.totalUSD)}</p>
        </div>
        <div className="text-end">
          <p className="text-[11px] text-white/45">{t('deposit')}</p>
          <p className="text-lg font-bold text-[#D4AE62]">{new Intl.NumberFormat(locale, { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(booking.depositUZS)}</p>
          <p className="text-[11px] text-white/40">≈ {new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(booking.depositUSD)}</p>
        </div>
      </div>

      {needsPayment && (
        <div className="mt-5 space-y-4 rounded-2xl bg-white/[0.03] p-4">
          {booking.status === 'REJECTED' && (
            <p className="flex items-start gap-2 text-xs text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {t('rejectedMessage', { reason: booking.rejectedReason || t('rejectedDefault') })}
            </p>
          )}
          <p className="text-sm font-semibold text-white">{t('step1')}</p>
          {payment.configured ? (
            <div className="rounded-xl bg-black/40 p-4">
              <p className="select-all font-mono text-lg tracking-wider text-white">{payment.cardNumber}</p>
              <p className="mt-1 text-xs text-white/60">{payment.holder}{payment.bank ? ` · ${payment.bank}` : ''}</p>
              <p className="mt-3 text-xs text-amber-300">{t.rich('commentHint', { number: booking.bookingNumber, b: (c) => <span className="font-mono font-bold">{c}</span> })}</p>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-500/10 p-4 text-xs text-amber-200">{t('notConfigured')}</p>
          )}

          <p className="text-sm font-semibold text-white">{t('step2')}</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          <button
            type="button"
            disabled={uploading || !payment.configured}
            onClick={() => fileRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AE62] px-5 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
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
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sky-500/10 p-4 text-xs text-sky-200">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          {t('pendingNote')}
        </p>
      )}

      {booking.workshop.unlocked && (
        <div className="mt-5 space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <Check className="h-4 w-4" />
            {t('unlockedTitle')}
          </p>
          <p className="text-base font-bold text-white">{booking.workshop.name}</p>
          {booking.workshop.address && (
            <p className="flex items-start gap-2 text-sm text-white/75">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AE62]" />
              {booking.workshop.address}
            </p>
          )}
          {booking.workshop.phone && (
            <a href={`tel:${booking.workshop.phone}`} className="flex items-center gap-2 text-sm text-white/85 hover:text-white">
              <Phone className="h-4 w-4 text-[#D4AE62]" />
              {booking.workshop.phone}
            </a>
          )}
          {booking.workshop.lat !== undefined && booking.workshop.lat !== 0 && (
            <a href={`https://www.google.com/maps?q=${booking.workshop.lat},${booking.workshop.lng}`} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-[#D4AE62] underline">
              {t('openMap')}
            </a>
          )}
          {booking.redemptionCode && (
            <div className="rounded-xl bg-black/40 p-3 text-center">
              <p className="text-[11px] text-white/50">{t('voucherCode')}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-white">{booking.redemptionCode}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
