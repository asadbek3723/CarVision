'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { BOOKING_STATUS_STYLE, BookingActions, BookingItems, type BookingView, type PaymentInfo } from '@/features/shop/BookingCard';
import { focusRing, pageWrap } from '@/features/account/preferences';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ready'; booking: BookingView; payment: PaymentInfo };

/** Everything about one booking: items and totals, then payment, approval, workshop and voucher. */
export function BookingDetail({ id }: { id: string }) {
  const t = useTranslations('profilePage');
  const tb = useTranslations('checkout.booking');
  const locale = useLocale();
  const [state, setState] = React.useState<State>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/bookings/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) setState({ kind: 'ready', booking: data.booking, payment: data.payment ?? { configured: false } });
      else if (res.status === 404) setState({ kind: 'missing' });
    } catch {
      // offline: keep what is on screen
      setState((s) => (s.kind === 'loading' ? { kind: 'missing' } : s));
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const profileHref = `/${locale}/profile`;

  if (state.kind === 'loading') {
    return (
      <div className={pageWrap}>
        <div className="flex justify-center py-24" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
        </div>
      </div>
    );
  }

  if (state.kind === 'missing') {
    return (
      <div className={pageWrap}>
        <PageHeader title={t('bookingNotFound')} back={{ href: profileHref }} />
        <Link href={profileHref} className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-gold-500 hover:text-gold-300 ${focusRing}`}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('backToProfile')}
        </Link>
      </div>
    );
  }

  const { booking, payment } = state;
  const status = BOOKING_STATUS_STYLE[booking.status];
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(booking.createdAt));

  return (
    <div className={pageWrap}>
      <PageHeader
        title={<span className="font-mono">#{booking.bookingNumber}</span>}
        subtitle={t('bookedOn', { date })}
        back={{ href: profileHref }}
        actions={
          <span className={`inline-flex items-center gap-2 text-sm font-semibold ${status.text}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
            {tb(status.key)}
          </span>
        }
      />

      <div className="grid gap-8 pt-2 sm:gap-12 sm:pt-4 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
        <section aria-label={t('itemsCount', { count: booking.items.length })}>
          <BookingItems booking={booking} large />
        </section>
        <section className="lg:pt-0 [&>*:first-child]:mt-0">
          <BookingActions booking={booking} payment={payment} onChanged={() => void load()} flat />
        </section>
      </div>
    </div>
  );
}
