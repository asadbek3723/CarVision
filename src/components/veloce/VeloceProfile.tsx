'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, ArrowUpRight, CalendarCheck, CarFront, ChevronRight, CircleHelp, Globe, LayoutDashboard, Loader2, Package, LogOut, Pencil, Settings2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { isSellerUser } from '@/features/auth/roles';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { BOOKING_STATUS_STYLE, type BookingView } from '@/features/shop/BookingCard';
import { initialsOf, LANGUAGES } from '@/features/account/preferences';
import { geist, md, mdFocus } from '@/features/minimal/theme';

/** Figma "Icon tile": 40px, radius 12, on the #222222 inner surface. */
const tile = `grid h-10 w-10 shrink-0 place-items-center rounded-xl ${md.tile} text-white`;
const roundBtn = `grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${mdFocus}`;

/** One booking inside the "Mening bronlarim" card: photo tile, part, status and total. */
function BookingRow({ booking, href }: { booking: BookingView; href: string }) {
  const t = useTranslations('checkout.booking');
  const { formatPrice } = useCurrency();
  const first = booking.items[0];
  const status = BOOKING_STATUS_STYLE[booking.status];

  return (
    <Link href={href} className={`group flex min-w-0 items-center gap-3 rounded-[14px] p-1 transition hover:bg-white/[0.03] ${mdFocus}`}>
      <span className={`${tile} overflow-hidden`}>
        {first?.image ? <img src={first.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-white">{first?.name ?? '—'}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px]">
          <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
          <span className={`truncate ${status.text}`}>{t(status.key)}</span>
          <span className={`shrink-0 font-mono ${md.faint}`}>#{booking.bookingNumber}</span>
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-white">{formatPrice(booking.totalUSD)}</span>
    </Link>
  );
}

interface RowProps {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  sub?: string;
  value?: string | undefined;
  last?: boolean;
}

/** Figma settings row: icon tile, title (+ subtitle), optional value and a chevron. */
function SettingsRow({ href, icon: Icon, title, sub, value, last }: RowProps) {
  return (
    <li>
      <Link href={href} className={`group flex min-h-[68px] items-center gap-4 px-4 transition hover:bg-white/[0.02] ${mdFocus}`}>
        <span className={tile}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className={`flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 ${last ? '' : `border-b ${md.line}`}`}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-tight text-white">{title}</span>
            {sub && <span className={`mt-1 block truncate text-[13px] leading-[1.35] ${md.muted}`}>{sub}</span>}
          </span>
          {value && <span className={`shrink-0 text-[13px] ${md.faint}`}>{value}</span>}
          <ChevronRight className={`h-4 w-4 shrink-0 ${md.faint} transition group-hover:translate-x-0.5 rtl:rotate-180`} />
        </span>
      </Link>
    </li>
  );
}

export function VeloceProfile() {
  const t = useTranslations('profilePage');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, signOut } = useAuth();
  const { count: cartCount } = useVeloceStore();

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

  // Workshop owners: Dashboard and their Cart live here. Regular users have the Cart in the dock and no studio.
  const isSeller = isSellerUser(user);
  const contact = user.phone || user.email;
  const name = user.full_name || t('guest');
  const base = `/${locale}/profile`;
  const planCode = user.plan?.code || 'free';
  const planLabel = t('planName', { plan: planCode.charAt(0).toUpperCase() + planCode.slice(1) });
  const languageName = LANGUAGES.find((l) => l.code === locale)?.name ?? locale.toUpperCase();

  const stats = [
    { label: t('credits'), value: user.credits_balance >= 1_000_000 ? '∞' : user.credits_balance.toLocaleString() },
    { label: t('statRenders'), value: rendersUsed === null ? '–' : rendersUsed.toLocaleString() },
    { label: t('statBookings'), value: bookingsLoading ? '–' : bookings.length.toLocaleString() },
  ];

  return (
    <div className={`${geist.className} ${md.page} min-h-full`}>
      <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-3 md:pt-8">
        {/* Title row */}
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-white md:text-[40px]">{t('title')}</h1>
          <Link href={`${base}/settings`} aria-label={t('settings')} title={t('settings')} className={`${roundBtn} border ${md.line} ${md.card} text-white hover:bg-[#1c1c1c]`}>
            <Settings2 className="h-5 w-5" strokeWidth={1.8} />
          </Link>
        </header>

        {/* Account */}
        <section className={`mt-6 flex flex-col gap-[18px] rounded-3xl p-5 ${md.card}`}>
          <div className="flex min-w-0 items-center gap-4">
            <div aria-hidden className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-[22px] font-semibold uppercase text-[#0A0A0A] ${md.accentBg}`}>
              {initialsOf(user.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-semibold leading-tight tracking-[-0.01em] text-white">{name}</p>
              {contact && (
                <p dir="ltr" className={`mt-1 truncate text-start text-[13px] ${md.muted}`}>
                  {contact}
                </p>
              )}
              {isSeller && (
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full py-[3px] pe-2.5 ps-2 text-[12px] font-medium ${md.accentSoft} ${md.accentText}`}>
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${md.accentBg}`} />
                  {planLabel}
                </span>
              )}
            </div>
            <Link href={`${base}/edit`} aria-label={t('editProfile')} title={t('editProfile')} className={`${roundBtn} ${md.tile} text-white hover:bg-[#2a2a2a]`}>
              <Pencil className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Link>
          </div>

          <dl className={`grid grid-cols-3 border-t pt-[18px] ${md.line}`}>
            {stats.map((s, i) => (
              <div key={s.label} className={`flex min-w-0 flex-col-reverse items-center gap-1.5 text-center ${i > 0 ? `border-s ${md.line}` : ''}`}>
                <dt className={`max-w-full truncate px-1 text-[12px] ${md.muted}`}>{s.label}</dt>
                <dd className="text-[24px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-white">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Bookings */}
        <section aria-labelledby="bookings-title" className={`mt-5 rounded-3xl p-5 ${md.card}`}>
          <div className="flex items-center justify-between gap-4">
            <h2 id="bookings-title" className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-white">
              {t('bookingsTitle')}
            </h2>
            <Link href={`${base}/stats`} className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg text-[14px] font-medium ${md.muted} transition hover:text-white ${mdFocus}`}>
              {t('details')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="mt-4">
            {bookingsLoading ? (
              <div className={`flex items-center gap-2 text-[13px] ${md.muted}`} role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loading')}
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex items-center gap-3.5">
                <span aria-hidden className={tile}>
                  <CalendarCheck className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <p className={`min-w-0 text-[13px] leading-[1.35] ${md.muted}`}>{t('bookingsSub')}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {bookings.slice(0, 3).map((b) => (
                  <li key={b.id} className="min-w-0">
                    <BookingRow booking={b} href={`${base}/bookings/${b.id}`} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href={`/${locale}/shop`}
            className={`mt-5 flex h-12 items-center justify-between gap-3 rounded-[14px] px-4 text-[15px] font-semibold text-white transition hover:bg-[#2a2a2a] ${md.tile} ${mdFocus}`}
          >
            <span className="truncate">{t('shopCta')}</span>
            <ArrowUpRight className="h-[18px] w-[18px] shrink-0 rtl:-scale-x-100" strokeWidth={2.2} />
          </Link>
        </section>

        {/* Settings list */}
        <ul className={`mt-5 overflow-hidden rounded-[20px] py-1 ${md.card}`}>
          <SettingsRow href={`/${locale}/customize`} icon={CarFront} title={t('carSetup')} sub={t('carSetupSub')} />
          {isSeller && (
            <>
              <SettingsRow href={`/${locale}/cart`} icon={ShoppingBag} title={t('cartRow')} value={cartCount > 0 ? String(cartCount) : undefined} />
              <SettingsRow href={`/${locale}/seller?tab=dashboard`} icon={LayoutDashboard} title={t('dashboard')} sub={t('manage')} />
            </>
          )}
          <SettingsRow href={`${base}/settings`} icon={Globe} title={t('language')} value={languageName} />
          <SettingsRow href={`/${locale}#faq`} icon={CircleHelp} title={t('help')} last />
        </ul>

        {/* Sign out: the shell sends a signed-out visitor to the login page */}
        <button
          type="button"
          onClick={() => void signOut()}
          className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-red-400 transition hover:bg-red-500/10 ${md.card} ${mdFocus}`}
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}
