'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, BarChart3, CalendarClock, LayoutDashboard, Loader2, Package, Pencil, RefreshCw, Settings, WalletCards } from 'lucide-react';
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
    { icon: WalletCards, label: t('credits'), value: user.credits_balance >= 1_000_000 ? '∞' : user.credits_balance.toLocaleString() },
    { icon: RefreshCw, label: t('statRenders'), value: rendersUsed === null ? '–' : rendersUsed.toLocaleString() },
    { icon: BarChart3, label: t('statBookings'), value: bookingsLoading ? '–' : bookings.length.toLocaleString() },
  ];

  return (
    <div className={pageWrap}>
      {/* Identity + actions */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="flex min-w-0 items-center gap-5 md:gap-10">
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gold-gradient font-heading text-3xl font-semibold uppercase text-black shadow-[0_0_0_6px_rgba(0,0,0,0.6),0_18px_50px_rgba(212,175,55,0.22)] md:h-28 md:w-28 md:text-5xl"
          >
            {initialsOf(user.full_name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-5xl">{name}</h1>
            <p className="mt-1.5 flex min-w-0 items-center gap-3 text-sm text-white/55 md:mt-3 md:text-lg">
              {contact && <span dir="ltr" className="truncate">{contact}</span>}
              {contact && <span aria-hidden="true" className="text-white/25">·</span>}
              <span className="flex shrink-0 items-center gap-2">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-white/40'}`} />
                <span className={isPaid ? 'text-gold-300' : 'text-white/60'}>{isPaid ? t('planActive') : t('planFree')}</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link href={`${base}/edit`} aria-label={t('editProfile')} title={t('editProfile')} className={iconLink}>
            <Pencil className="h-5 w-5" />
          </Link>
          <Link href={`${base}/settings`} aria-label={t('settings')} title={t('settings')} className={iconLink}>
            <Settings className="h-5 w-5" />
          </Link>
          <Link
            href={isPaid ? `/${locale}/seller?tab=dashboard` : `/${locale}/plans`}
            className={`ms-3 inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-full px-7 text-base font-semibold text-gold-300 ring-1 ring-inset ring-gold-500/60 transition hover:bg-gold-500/10 hover:text-gold-200 md:flex-none ${focusRing}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="truncate">{t('dashboard')}</span>
          </Link>
        </div>
      </header>

      {/* Numbers: one row across the page */}
      <dl className="mt-10 grid grid-cols-3 md:mt-16">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5 ${i > 0 ? 'border-s border-white/10 ps-4 sm:ps-8 lg:ps-24' : 'pe-4'}`}>
            <s.icon aria-hidden="true" className="h-6 w-6 shrink-0 text-gold-500 md:h-9 md:w-9" />
            <div className="min-w-0">
              <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.02em] text-white md:text-4xl">{s.value}</dd>
              <dt className="mt-0.5 truncate text-xs text-white/55 md:text-base">{s.label}</dt>
            </div>
          </div>
        ))}
      </dl>

      {/* Bookings */}
      <section aria-labelledby="bookings-title" className="mt-14 md:mt-24">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 border-s-2 border-gold-500 ps-4 md:ps-6">
            <h2 id="bookings-title" className="font-heading text-xl font-semibold tracking-[-0.01em] text-white md:text-3xl">
              {t('bookingsTitle')}
            </h2>
            <p className="mt-1 text-sm text-white/55 md:text-base">{t('bookingsSub')}</p>
          </div>
          <Link href={`${base}/stats`} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg text-sm font-semibold text-gold-500 transition hover:text-gold-300 md:text-base ${focusRing}`}>
            {t('details')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        <div className="mt-8 md:mt-12">
          {bookingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/50" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading')}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center md:py-20">
              <CalendarClock aria-hidden="true" className="h-14 w-14 text-white/35 md:h-16 md:w-16" strokeWidth={1.4} />
              <p className="mt-5 text-lg font-semibold text-white md:text-xl">{t('noBookings')}</p>
              <p className="mt-2 text-sm text-white/45 md:text-base">
                {t.rich('emptyHint', {
                  shop: (chunks) => (
                    <Link href={`/${locale}/shop`} className={`rounded font-semibold text-gold-500 transition hover:text-gold-300 ${focusRing}`}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
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
