'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, ChevronDown, Coins, Globe, LayoutDashboard, LogOut, Loader2, Pencil, X } from 'lucide-react';
import { buttonClasses } from '@/components/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { SupportedCurrency } from '@/domain/currency';
import { BookingCard, type BookingView, type PaymentInfo } from '@/features/shop/BookingCard';
import { ProfileExtras } from '@/features/account/ProfileExtras';

const LANGUAGES = [
  { code: 'uz', name: "O'zbekcha" },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'ky', name: 'Кыргызча' },
  { code: 'tg', name: 'Тоҷикӣ' },
] as const;

const CURRENCIES: SupportedCurrency[] = ['UZS', 'USD', 'AED', 'TRY', 'KZT', 'KGS', 'TJS', 'RUB'];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0F]';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return (Array.from(first)[0] ?? '') + (Array.from(last)[0] ?? '');
}

interface PreferenceOption {
  value: string;
  label: string;
  hint?: string;
}

/** Native select (best picker on phones, fully accessible) — no box, just the value and a chevron. */
function PreferenceSelect({
  id,
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  options: PreferenceOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-white/45">
        <Icon className="h-4 w-4 text-gold-500" />
        {label}
      </label>
      <div className="relative mt-1">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 w-full cursor-pointer appearance-none rounded-lg bg-transparent pe-8 font-heading text-lg font-medium text-white transition group-hover:text-gold-300 sm:text-xl ${focusRing}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-1 text-white">
              {o.hint ? `${o.label} · ${o.hint}` : o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-0 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition group-hover:text-gold-300" />
      </div>
    </div>
  );
}

/** One section: title on the start side, content filling the rest (stacked on phones). */
function Section({
  id,
  title,
  sub,
  aside,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-5 py-10 md:py-14 lg:grid-cols-[minmax(220px,300px)_1fr] lg:gap-16">
      <div>
        <h2 id={id} className="font-heading text-lg font-semibold tracking-[-0.01em] text-white md:text-xl">
          {title}
        </h2>
        {sub && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-white/45">{sub}</p>}
        {aside && <div className="mt-4">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const textLink = `inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-gold-500 transition hover:text-gold-300 ${focusRing}`;

export function VeloceProfile() {
  const t = useTranslations('profilePage');
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, signOut, updateProfile } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [bookings, setBookings] = React.useState<BookingView[]>([]);
  const [payment, setPayment] = React.useState<PaymentInfo>({ configured: false });
  const [bookingsLoading, setBookingsLoading] = React.useState(true);

  const [rendersUsed, setRendersUsed] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
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

  const [editing, setEditing] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(user?.full_name ?? '');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);

  React.useEffect(() => {
    if (user?.full_name) setNameInput(user.full_name);
  }, [user?.full_name]);

  const loadBookings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/bookings', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookings(data.bookings ?? []);
        setPayment(data.payment ?? { configured: false });
      }
    } catch {
      // offline: keep what we have
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user) void loadBookings();
    else setBookingsLoading(false);
  }, [user, loadBookings]);

  const localizedPath = (target: string) =>
    pathname.replace(/^\/(uz|ru|en|ar|tr|kk|ky|tg)(?=\/|$)/, `/${target}`);

  const startEditing = () => {
    setNameInput(user?.full_name ?? '');
    setSaveError(false);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = nameInput.trim();
    if (!user || fullName.length < 2) {
      setSaveError(true);
      return;
    }
    if (fullName === user.full_name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
      if (!res.ok) throw new Error('save failed');
      updateProfile({ full_name: fullName });
      setEditing(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  // Signed-out visitors are redirected by the shell; render nothing meanwhile.
  if (!user) return null;

  const isPaid = user.plan?.isPaid === true;
  const contact = user.phone || user.email;
  const name = user.full_name || t('guest');


  const stats = [
    { label: t('credits'), value: user.credits_balance >= 1_000_000 ? '∞' : user.credits_balance.toLocaleString() },
    { label: t('statRenders'), value: rendersUsed === null ? '–' : rendersUsed.toLocaleString() },
    { label: t('statBookings'), value: bookingsLoading ? '–' : bookings.length.toLocaleString() },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 pb-28 pt-8 md:px-10 md:pt-16 lg:px-16">
      {/* Identity */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-lg font-semibold uppercase text-black sm:h-16 sm:w-16 md:h-24 md:w-24 md:text-3xl"
          >
            {initialsOf(user.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={handleSave} className="flex items-center gap-2">
                <label htmlFor="profile-name" className="sr-only">
                  {t('namePlaceholder')}
                </label>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  maxLength={100}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  aria-invalid={saveError}
                  className={`min-w-0 flex-1 rounded-lg bg-transparent py-2 font-heading text-xl font-semibold text-white placeholder:text-white/30 md:text-4xl ${focusRing}`}
                />
                <button type="submit" disabled={saving} className={buttonClasses({ size: 'sm', className: 'shrink-0 px-4' })}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
                </button>
                <button type="button" onClick={() => setEditing(false)} aria-label={t('cancel')} className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'shrink-0 px-3' })}>
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <h1 className="truncate font-heading text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-2xl md:text-5xl">
                {name}
              </h1>
            )}
            <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-white/50 md:mt-3 md:text-base">
              {contact && <span dir="ltr" className="truncate">{contact}</span>}
              {contact && <span aria-hidden="true" className="text-white/20">·</span>}
              <span className={`shrink-0 font-medium ${isPaid ? 'text-gold-300' : 'text-white/60'}`}>
                {isPaid ? t('planActive') : t('planFree')}
              </span>
            </p>
            {saveError && (
              <p role="alert" className="mt-1.5 text-sm text-red-300">
                {t('saveError')}
              </p>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 md:flex md:items-center">
          <button type="button" onClick={startEditing} className={buttonClasses({ variant: 'ghost', size: 'md', fullWidth: true, className: 'md:w-auto' })}>
            <Pencil className="h-4 w-4" />
            <span className="truncate">{t('editProfile')}</span>
          </button>
          <Link href={isPaid ? `/${locale}/seller?tab=dashboard` : `/${locale}/plans`} className={buttonClasses({ size: 'md', fullWidth: true, className: 'md:w-auto md:px-6' })}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="truncate">{t('dashboard')}</span>
          </Link>
        </div>
      </header>

      {/* Stats: big numbers, no tiles */}
      <section aria-labelledby="stats-title" className="mt-12 md:mt-20">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="stats-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            {t('statsTitle')}
          </h2>
          <Link href={`/${locale}/profile/stats`} className={textLink}>
            <BarChart3 className="h-4 w-4" />
            <span className="truncate">{t('viewStats')}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 md:mt-6 md:gap-10">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dd className="font-display text-3xl font-semibold tabular-nums tracking-[-0.02em] text-white md:text-6xl">{s.value}</dd>
              <dt className="mt-1 truncate text-xs text-white/45 md:mt-2 md:text-sm">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 md:mt-10">
        {/* Bookings */}
        <Section id="bookings-title" title={t('bookingsTitle')} sub={t('bookingsSub')}>
          {bookingsLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-white/50" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading')}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-6">
              <p className="text-base text-white/55">{t('noBookings')}</p>
              <Link href={`/${locale}/shop`} className={textLink}>
                {t('browse')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-x-16 gap-y-10 xl:grid-cols-2">
              {bookings.map((b) => (
                <BookingCard key={b.id} flat booking={b} payment={payment} onChanged={() => void loadBookings()} />
              ))}
            </div>
          )}
        </Section>

        {/* Preferences */}
        <Section id="prefs-title" title={t('langCurrency')}>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-12">
            <PreferenceSelect
              id="pref-language"
              icon={Globe}
              label={t('language')}
              value={locale}
              onChange={(code) => router.push(localizedPath(code))}
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.name, hint: l.code.toUpperCase() }))}
            />
            <PreferenceSelect
              id="pref-currency"
              icon={Coins}
              label={t('currency')}
              value={currency}
              onChange={(code) => setCurrency(code as SupportedCurrency)}
              options={CURRENCIES.map((code) => ({ value: code, label: code }))}
            />
          </div>
        </Section>

        {/* Account */}
        <Section id="account-title" title={t('account')}>
          <ProfileExtras />
          <button
            type="button"
            onClick={signOut}
            className={`mt-2 flex min-h-14 w-full items-center gap-4 rounded-lg text-start text-sm font-medium text-white/55 transition hover:text-red-300 ${focusRing}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {t('signOut')}
          </button>
        </Section>
      </div>
    </div>
  );
}
