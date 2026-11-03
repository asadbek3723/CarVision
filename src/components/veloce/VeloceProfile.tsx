'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { LogOut, Globe, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { SupportedCurrency } from '@/domain/currency';
import { BookingCard, type BookingView, type PaymentInfo } from '@/features/shop/BookingCard';

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

const CURRENCIES: SupportedCurrency[] = [
  'UZS',
  'USD',
  'AED',
  'TRY',
  'KZT',
  'KGS',
  'TJS',
  'RUB',
];

export function VeloceProfile() {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, signOut, updateProfile } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [bookings, setBookings] = React.useState<BookingView[]>([]);
  const [payment, setPayment] = React.useState<PaymentInfo>({ configured: false });
  const [bookingsLoading, setBookingsLoading] = React.useState(true);
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(user?.full_name || '');
  const [phoneInput, setPhoneInput] = React.useState(user?.phone || '+998 90 123 45 67');

  React.useEffect(() => {
    if (user?.full_name) setNameInput(user.full_name);
    if (user?.phone) setPhoneInput(user.phone);
  }, [user]);

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

  const buildLocalizedPath = (targetLocale: string) => {
    return pathname.replace(/^\/(uz|ru|en|ar|tr|kk|ky|tg)(?=\/|$)/, `/${targetLocale}`);
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const fullName = nameInput.trim() || user.full_name;
      try {
        const res = await fetch('/api/v1/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName }),
        });
        if (res.ok) updateProfile({ full_name: fullName });
      } catch {
        // keep the old name
      }
    }
    setEditingName(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-28 md:px-10 md:pt-12">
      {/* 1. Simple User Header (Boxless) */}
      <div className="flex flex-col gap-4 pb-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-[#D4AE62]">
            Shaxsiy Profil
          </p>
          {editingName ? (
            <form onSubmit={handleSaveIdentity} className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ismingiz"
                className="rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white focus:outline-none"
              />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+998..."
                className="rounded-xl bg-white/[0.06] px-4 py-2.5 font-mono text-sm text-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#D4AE62] px-4 py-2.5 text-xs font-bold uppercase text-black cursor-pointer"
              >
                Saqlash
              </button>
            </form>
          ) : (
            <>
              <h1 className="mt-1 font-display text-2xl font-light text-white sm:text-4xl">
                {user?.full_name || 'Mehmon Foydalanuvchi'}
              </h1>
              <p className="mt-1 font-mono text-sm text-white/55">
                {user?.phone || '+998 90 123 45 67'}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <>
              {!editingName && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="rounded-2xl bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-white/80 hover:bg-white/[0.1] cursor-pointer"
                >
                  Tahrirlash
                </button>
              )}
              {user.role === 'b2b_seller' && (
                <Link
                  href={`/${locale}/seller?tab=dashboard`}
                  className="rounded-2xl bg-gold-gradient px-5 py-2.5 text-xs font-bold uppercase text-black"
                >
                  Ustaxona Boshqaruvi
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-xs text-white/60 hover:text-red-400 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Chiqish</span>
              </button>
            </>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="rounded-2xl bg-gold-gradient px-6 py-3 text-xs font-bold uppercase text-black"
            >
              Tizimga Kirish
            </Link>
          )}
        </div>
      </div>

      {/* 2. My bookings (3% deposit flow) */}
      {user && (
        <section className="pb-12 pt-4">
          <h2 className="font-display text-xl font-light text-white">Mening bronlarim</h2>
          <p className="mt-1 text-xs text-white/50">3% zakalat to‘langach ustaxona manzili va telefoni shu yerda ochiladi.</p>

          {bookingsLoading ? (
            <p className="mt-6 text-sm text-white/50">Yuklanmoqda…</p>
          ) : bookings.length === 0 ? (
            <div className="mt-6 py-6">
              <p className="text-sm text-white/50">Hozircha bronlar yo‘q.</p>
              <Link href={`/${locale}/shop`} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-5 py-3 text-xs font-semibold uppercase text-[#D4AE62] hover:bg-white/[0.1]">
                <span>Detallarni ko‘rish</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} payment={payment} onChanged={() => void loadBookings()} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Simple Language & Currency Switcher */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-[#D4AE62]">
          <Globe className="h-4 w-4" />
          <span>Til va Valyuta</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const active = locale === lang.code;
            return (
              <Link
                key={lang.code}
                href={buildLocalizedPath(lang.code)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-medium transition ${
                  active
                    ? 'bg-[#D4AE62] text-black font-semibold'
                    : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span>{lang.name}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((curr) => {
            const active = currency === curr;
            return (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase transition cursor-pointer ${
                  active
                    ? 'bg-[#D4AE62]/20 text-[#D4AE62]'
                    : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {curr}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
