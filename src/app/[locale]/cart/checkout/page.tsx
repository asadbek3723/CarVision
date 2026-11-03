'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BookingCard, type BookingView, type PaymentInfo } from '@/features/shop/BookingCard';
import type { VeloceProduct } from '@/domain/veloce-catalog';

const fieldCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-[#D4AE62]/60';

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const apiError = useApiError();
  const params = useParams();
  const search = useSearchParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const resumeId = search?.get('booking') ?? null;
  const { cart, clearCart } = useVeloceStore();
  const { formatPrice } = useCurrency();
  const { user, isLoading: authLoading } = useAuth();

  const [products, setProducts] = React.useState<VeloceProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [bookings, setBookings] = React.useState<BookingView[]>([]);
  const [payment, setPayment] = React.useState<PaymentInfo>({ configured: false });

  const cartIds = React.useMemo(() => Object.keys(cart), [cart]);

  React.useEffect(() => {
    if (user) {
      setName((n) => n || user.full_name || '');
      setPhone((p) => p || user.phone || '');
    }
  }, [user]);

  // Cart items from the real catalog
  React.useEffect(() => {
    if (resumeId) {
      setLoadingProducts(false);
      return;
    }
    if (cartIds.length === 0) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    fetch(`/api/v1/products?ids=${cartIds.join(',')}&limit=100`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setProducts(d.products ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartIds, resumeId]);

  const reloadBookings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/bookings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setPayment(data.payment);
        setBookings((prev) => {
          const wanted = new Set(prev.length ? prev.map((b) => b.id) : resumeId ? [resumeId] : []);
          return (data.bookings as BookingView[]).filter((b) => wanted.has(b.id));
        });
      }
    } catch {
      // keep the last known state
    }
  }, [resumeId]);

  React.useEffect(() => {
    if (resumeId && user) void reloadBookings();
  }, [resumeId, user, reloadBookings]);

  const lines = products.map((p) => ({ p, qty: cart[p.id] ?? 1 }));
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const deposit = Math.max(1, Math.round(total * 0.03));
  const hasUnavailable = lines.some((l) => l.p.stock <= 0);
  const missing = cartIds.length - products.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError(t('errName'));
    if (phone.replace(/\D/g, '').length < 9) return setError(t('errPhone'));
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ id: l.p.id, quantity: l.qty })),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(apiError(data, t('errCreate')));
      setPayment(data.payment);
      setBookings(data.bookings);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <VeloceShell>
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-4 md:px-8">{children}</div>
    </VeloceShell>
  );

  if (authLoading || loadingProducts) {
    return shell(
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" />
      </div>
    );
  }

  if (!user) {
    return shell(
      <div className="mt-10 rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-6 text-center">
        <p className="text-sm text-white/80">{t('loginRequired')}</p>
        <Link href={`/${locale}/login`} className="mt-4 inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-sm font-bold text-black">
          {t('login')}
        </Link>
      </div>
    );
  }

  // After the booking exists: payment + status
  if (bookings.length > 0) {
    return shell(
      <>
        <h1 className="mb-1 text-xl font-bold text-white">{t('created')}</h1>
        <p className="mb-5 text-sm text-white/55">{t('createdSub')}</p>
        <div className="space-y-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} payment={payment} onChanged={() => void reloadBookings()} />
          ))}
        </div>
        <Link href={`/${locale}/profile`} className="mt-6 inline-block text-sm text-[#D4AE62] underline">
          {t('myBookings')}
        </Link>
      </>
    );
  }

  if (resumeId) return shell(<p className="py-20 text-center text-sm text-white/60">{t('notFound')}</p>);

  if (lines.length === 0) {
    return shell(
      <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-10 text-center">
        <p className="text-sm text-white/70">{t('cartEmpty')}</p>
        <Link href={`/${locale}/shop`} className="mt-4 inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-sm font-bold text-black">
          {t('goToShop')}
        </Link>
      </div>
    );
  }

  return shell(
    <>
      <Link href={`/${locale}/cart`} className="mb-5 inline-flex items-center gap-2 text-xs text-white/55 hover:text-white">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t('backToCart')}
      </Link>
      <h1 className="mb-5 text-xl font-bold text-white">{t('title')}</h1>

      <section className="rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-5">
        <ul className="space-y-3">
          {lines.map(({ p, qty }) => (
            <li key={p.id} className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                <p className="text-[11px] text-white/45">{p.brand}{qty > 1 ? ` · ×${qty}` : ''}{p.stock <= 0 ? ` · ${t('outOfStockTag')}` : ''}</p>
              </div>
              <p className="text-sm font-semibold text-white/85">{formatPrice(p.price * qty)}</p>
            </li>
          ))}
        </ul>
        {missing > 0 && <p className="mt-3 text-xs text-amber-300">{t('missing', { count: missing })}</p>}
        <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[11px] text-white/45">{t('totalAtWorkshop')}</p>
            <p className="text-lg font-bold text-white">{formatPrice(total)}</p>
          </div>
          <div className="text-end">
            <p className="text-[11px] text-white/45">{t('depositNow')}</p>
            <p className="text-lg font-bold text-[#D4AE62]">{formatPrice(deposit)}</p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="mt-4 space-y-4 rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/60" htmlFor="c-name">{t('name')}</label>
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={fieldCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/60" htmlFor="c-phone">{t('phone')}</label>
          <input id="c-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className={fieldCls} />
          <p className="mt-1 text-[11px] text-white/40">{t('phoneHint')}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/60" htmlFor="c-note">{t('note')}</label>
          <textarea id="c-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className={`${fieldCls} resize-none`} />
        </div>

        <p className="flex items-start gap-2 text-xs text-white/55">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AE62]" />
          {t('lockedInfo')}
        </p>

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

        <button
          type="submit"
          disabled={submitting || hasUnavailable || missing > 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AE62] px-6 py-3.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('submit')}
        </button>
      </form>
    </>
  );
}
