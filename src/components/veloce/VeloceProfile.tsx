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

/** Native select (best picker on phones, fully accessible) wearing the gold-on-black skin. */
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
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-500" />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-14 w-full cursor-pointer appearance-none rounded-2xl bg-white/[0.04] ps-11 pe-12 text-base text-white transition hover:bg-white/[0.07] ${focusRing}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-1 text-white">
              {o.hint ? `${o.label} · ${o.hint}` : o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
      {children}
    </h2>
  );
}

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

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-8 md:px-8 md:pt-14">
      {/* Identity: one row */}
      <header className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-lg font-semibold uppercase text-black sm:h-16 sm:w-16"
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
                className={`min-w-0 flex-1 rounded-full bg-white/[0.06] px-4 py-2.5 text-base text-white placeholder:text-white/35 ${focusRing}`}
              />
              <button type="submit" disabled={saving} className={buttonClasses({ size: 'sm', className: 'shrink-0 px-4' })}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
              </button>
              <button type="button" onClick={() => setEditing(false)} aria-label={t('cancel')} className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'shrink-0 px-3' })}>
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <>
              <h1 className="truncate font-heading text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-2xl">{name}</h1>
              <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-white/55">
                {contact && <span dir="ltr" className="truncate">{contact}</span>}
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isPaid ? 'bg-gold-500/15 text-gold-300' : 'bg-white/[0.06] text-white/60'}`}>
                  {isPaid ? t('planActive') : t('planFree')}
                </span>
              </p>
            </>
          )}
          {saveError && (
            <p role="alert" className="mt-1.5 text-sm text-red-300">
              {t('saveError')}
            </p>
          )}
        </div>
      </header>

      {/* Dashboard + edit profile, side by side */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href={isPaid ? `/${locale}/seller?tab=dashboard` : `/${locale}/plans`} className={buttonClasses({ size: 'md', fullWidth: true })}>
          <LayoutDashboard className="h-4 w-4" />
          <span className="truncate">{t('dashboard')}</span>
        </Link>
        <button type="button" onClick={startEditing} className={buttonClasses({ variant: 'quiet', size: 'md', fullWidth: true })}>
          <Pencil className="h-4 w-4" />
          <span className="truncate">{t('editProfile')}</span>
        </button>
      </div>

      {/* Short statistics + the full page */}
      <section aria-labelledby="stats-title" className="mt-8">
        <h2 id="stats-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t('statsTitle')}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            { label: t('credits'), value: user.credits_balance >= 1_000_000 ? '∞' : user.credits_balance.toLocaleString() },
            { label: t('statRenders'), value: rendersUsed === null ? '–' : rendersUsed.toLocaleString() },
            { label: t('statBookings'), value: bookingsLoading ? '–' : bookings.length.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.04] px-3 py-4 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-white">{s.value}</p>
              <p className="mt-1 truncate text-[11px] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
        <Link href={`/${locale}/profile/stats`} className={buttonClasses({ variant: 'quiet', size: 'md', fullWidth: true, className: 'mt-3' })}>
          <BarChart3 className="h-4 w-4" />
          <span className="truncate">{t('viewStats')}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </section>

      {/* Preferences */}
      <section className="mt-12" aria-labelledby="prefs-title">
        <h2 id="prefs-title" className="sr-only">
          {t('langCurrency')}
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
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
      </section>

      {/* Bookings */}
      <section className="mt-12" aria-labelledby="bookings-title">
        <h2
          id="bookings-title"
          className="font-display text-xl font-semibold tracking-tight text-white"
        >
          {t('bookingsTitle')}
        </h2>
        <p className="mb-5 mt-1 text-sm text-white/50">{t('bookingsSub')}</p>

        {bookingsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-white/50" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.04] p-6 text-center">
            <p className="text-sm text-white/55">{t('noBookings')}</p>
            <Link
              href={`/${locale}/shop`}
              className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.07] px-5 text-sm font-semibold text-gold-500 transition hover:bg-white/[0.12] ${focusRing}`}
            >
              {t('browse')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                payment={payment}
                onChanged={() => void loadBookings()}
              />
            ))}
          </div>
        )}
      </section>

      {/* Account */}
      <section className="mt-12" aria-labelledby="account-title">
        <h2 id="account-title" className="sr-only">
          {t('account')}
        </h2>
        <SectionTitle>{t('account')}</SectionTitle>
        <ProfileExtras />

        <button
          type="button"
          onClick={signOut}
          className={`mt-3 flex min-h-14 w-full items-center gap-4 rounded-3xl bg-white/[0.04] px-5 text-start text-sm font-medium text-white/70 transition hover:bg-red-500/10 hover:text-red-300 ${focusRing}`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {t('signOut')}
        </button>
      </section>
    </div>
  );
}
