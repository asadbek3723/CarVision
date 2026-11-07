'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, BarChart3, LayoutDashboard, Loader2, Package, Pencil, Settings } from 'lucide-react';
import { buttonClasses } from '@/components/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { BOOKING_STATUS_STYLE, type BookingView } from '@/features/shop/BookingCard';
import { focusRing, initialsOf, pageWrap } from '@/features/account/preferences';

const iconLink = `flex h-12 w-12 items-center justify-center rounded-full text-white/70 transition hover:bg-white/[0.06] hover:text-white ${focusRing}`;

/** One booking on the profile: photo, status, number, part and total. Opens the full booking. */
function BookingTile({ booking, href }: { booking: BookingView; href: string }) {
  const t = useTranslations('checkout.booking');
  const tp = useTranslations('profilePage');
  const { formatPrice } = useCurrency();
  const first = booking.items[0];
  const status = BOOKING_STATUS_STYLE[booking.status];

  return (
    <Link href={href} className={`group block min-w-0 rounded-2xl ${focusRing}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-1">
        {first?.image ? (
          <img src={first.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/25">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 text-[11px] font-semibold md:text-xs">
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
        <span className={`truncate ${status.text}`}>{t(status.key)}</span>
        <span className="ms-auto shrink-0 font-mono text-white/35">#{booking.bookingNumber}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-white transition group-hover:text-gold-300 md:text-base">
        {first?.name ?? '—'}
      </p>
      <p className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-white/45 md:text-sm">
        <span className="truncate">{tp('itemsCount', { count: booking.items.reduce((s, i) => s + i.quantity, 0) })}</span>
        <span className="shrink-0 font-semibold text-white/80">{formatPrice(booking.totalUSD)}</span>
      </p>
    </Link>
  );
}

export function VeloceProfile() {
  const t = useTranslations('profilePage');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user } = useAuth();

  const [bookings, setBookings] = React.useState<BookingView[]>([]);
  const [bookingsLoading, setBookingsLoading] = React.useState(true);
  const [rendersUsed, setRendersUsed] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!user) {
      setBookingsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/bookings', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && res.ok && data.success) setBookings(data.bookings ?? []);
      } catch {
        // offline: keep what we have
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();
    (async () => {
      try {
        const res = await fetch('/api/v1/credits/history', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && res.ok && data.success) {
          setRendersUsed((data.entries ?? []).filter((e: { amount: number }) => e.amount < 0).length);
        }
      } catch {
        // offline: the summary just shows a dash
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Signed-out visitors are redirected by the shell; render nothing meanwhile.
  if (!user) return null;

  const isPaid = user.plan?.isPaid === true;
  const contact = user.phone || user.email;
  const name = user.full_name || t('guest');
  const base = `/${locale}/profile`;

  const stats = [
    { label: t('credits'), value: user.credits_balance >= 1_000_000 ? '∞' : user.credits_balance.toLocaleString() },
    { label: t('statRenders'), value: rendersUsed === null ? '–' : rendersUsed.toLocaleString() },
    { label: t('statBookings'), value: bookingsLoading ? '–' : bookings.length.toLocaleString() },
  ];

  return (
    <div className={pageWrap}>
      {/* Identity + actions */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-xl font-semibold uppercase text-black md:h-24 md:w-24 md:text-3xl"
          >
            {initialsOf(user.full_name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-5xl">{name}</h1>
            <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-white/50 md:mt-2.5 md:text-base">
              {contact && <span dir="ltr" className="truncate">{contact}</span>}
              {contact && <span aria-hidden="true" className="text-white/20">·</span>}
              <span className={`shrink-0 font-medium ${isPaid ? 'text-gold-300' : 'text-white/60'}`}>{isPaid ? t('planActive') : t('planFree')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Link href={`${base}/edit`} aria-label={t('editProfile')} title={t('editProfile')} className={iconLink}>
            <Pencil className="h-5 w-5" />
          </Link>
          <Link href={`${base}/stats`} aria-label={t('viewStats')} title={t('viewStats')} className={iconLink}>
            <BarChart3 className="h-5 w-5" />
          </Link>
          <Link href={`${base}/settings`} aria-label={t('settings')} title={t('settings')} className={iconLink}>
            <Settings className="h-5 w-5" />
          </Link>
          <Link
            href={isPaid ? `/${locale}/seller?tab=dashboard` : `/${locale}/plans`}
            className={buttonClasses({ size: 'md', className: 'ms-2 flex-1 lg:flex-none lg:px-7' })}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="truncate">{t('dashboard')}</span>
          </Link>
        </div>
      </header>

      {/* Numbers */}
      <dl className="mt-10 grid grid-cols-3 gap-4 md:mt-16 md:max-w-3xl md:gap-12">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dd className="font-display text-3xl font-semibold tabular-nums tracking-[-0.02em] text-white md:text-5xl">{s.value}</dd>
            <dt className="mt-1 truncate text-xs text-white/45 md:mt-2 md:text-sm">{s.label}</dt>
          </div>
        ))}
      </dl>

      {/* Bookings */}
      <section aria-labelledby="bookings-title" className="mt-12 md:mt-20">
        <h2 id="bookings-title" className="font-heading text-xl font-semibold tracking-[-0.01em] text-white md:text-2xl">
          {t('bookingsTitle')}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-white/45">{t('bookingsSub')}</p>

        <div className="mt-6 md:mt-8">
          {bookingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/50" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading')}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-6">
              <p className="text-base text-white/55">{t('noBookings')}</p>
              <Link href={`/${locale}/shop`} className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-gold-500 transition hover:text-gold-300 ${focusRing}`}>
                {t('browse')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-8 md:gap-y-12">
              {bookings.map((b) => (
                <li key={b.id} className="min-w-0">
                  <BookingTile booking={b} href={`${base}/bookings/${b.id}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
