'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowRight, Check, LogOut, Loader2, Pencil } from 'lucide-react';
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
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AE62]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0F]';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return (Array.from(first)[0] ?? '') + (Array.from(last)[0] ?? '');
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
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, signOut, updateProfile } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [bookings, setBookings] = React.useState<BookingView[]>([]);
  const [payment, setPayment] = React.useState<PaymentInfo>({ configured: false });
  const [bookingsLoading, setBookingsLoading] = React.useState(true);

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
      {/* Identity */}
      <header className="flex items-start gap-4 sm:items-center sm:gap-5">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-xl font-semibold uppercase text-black sm:h-20 sm:w-20 sm:text-2xl"
        >
          {initialsOf(user.full_name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AE62]">
            {t('eyebrow')}
          </p>

          {editing ? (
            <form onSubmit={handleSave} className="mt-2">
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
                className={`w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 ${focusRing}`}
              />
              {saveError && (
                <p role="alert" className="mt-2 text-sm text-red-300">
                  {t('saveError')}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#D4AE62] px-6 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60 ${focusRing}`}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full bg-white/[0.06] px-5 text-sm font-medium text-white/80 transition hover:bg-white/[0.1] ${focusRing}`}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="min-w-0 truncate font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {name}
                </h1>
                <button
                  type="button"
                  onClick={startEditing}
                  aria-label={t('edit')}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white ${focusRing}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              {contact && (
                <p dir="ltr" className="mt-0.5 truncate text-sm text-white/55 text-start">
                  {contact}
                </p>
              )}
            </>
          )}
        </div>
      </header>

      {/* Balance and plan */}
      <section aria-label={t('plan')} className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white/[0.04] p-5">
          <p className="text-xs font-medium text-white/45">{t('credits')}</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-white">
            {user.credits_balance}
          </p>
        </div>
        <div className="flex flex-col justify-between rounded-3xl bg-white/[0.04] p-5">
          <div>
            <p className="text-xs font-medium text-white/45">{t('plan')}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">
              {isPaid ? t('planActive') : t('planFree')}
            </p>
          </div>
        </div>
        <Link
          href={isPaid ? `/${locale}/seller?tab=dashboard` : `/${locale}/plans`}
          className={`col-span-2 flex min-h-12 items-center justify-between rounded-2xl bg-gold-gradient px-5 text-sm font-semibold text-black transition hover:brightness-105 ${focusRing}`}
        >
          <span>{isPaid ? t('manage') : t('upgrade')}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
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
              className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.07] px-5 text-sm font-semibold text-[#D4AE62] transition hover:bg-white/[0.12] ${focusRing}`}
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

      {/* Preferences */}
      <section className="mt-12" aria-labelledby="prefs-title">
        <h2 id="prefs-title" className="sr-only">
          {t('langCurrency')}
        </h2>

        <SectionTitle>{t('language')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGES.map((lang) => {
            const active = locale === lang.code;
            return (
              <Link
                key={lang.code}
                href={localizedPath(lang.code)}
                hrefLang={lang.code}
                aria-current={active ? 'true' : undefined}
                className={`flex min-h-11 items-center justify-between gap-2 rounded-2xl px-4 text-sm transition ${focusRing} ${
                  active
                    ? 'bg-[#D4AE62] font-semibold text-black'
                    : 'bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span className="truncate">{lang.name}</span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <SectionTitle>{t('currency')}</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {CURRENCIES.map((code) => {
              const active = currency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={active}
                  className={`min-h-11 rounded-2xl text-sm font-semibold transition ${focusRing} ${
                    active
                      ? 'bg-[#D4AE62] text-black'
                      : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>
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
