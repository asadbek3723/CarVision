'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  Lock,
  Navigation,
  Car,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/features/auth/context/AuthContext';

interface CheckoutProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  targetCar?: string;
  seller?: {
    id: string;
    business_name: string;
    phone?: string;
    address?: string;
  };
}

export interface UnlockedWorkshopLead {
  id: string;
  partName: string;
  partImage: string;
  targetCar: string;
  partPriceUSD: number;
  depositPaidUSD: number;
  workshopName: string;
  workshopAddress: string;
  workshopPhone: string;
  customerPhone: string;
  unlockedAt: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const directPartId = searchParams?.get('partId');

  const { cart, clearCart } = useVeloceStore();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();

  const [productsMap, setProductsMap] = React.useState<Record<string, CheckoutProduct>>({});
  const [loading, setLoading] = React.useState(true);

  const [customerName, setCustomerName] = React.useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = React.useState(user?.phone || '+998 ');
  const [paymentMethod, setPaymentMethod] = React.useState<'Click' | 'Payme' | 'Uzum'>('Click');

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [unlockedLead, setUnlockedLead] = React.useState<UnlockedWorkshopLead | null>(null);

  React.useEffect(() => {
    if (user?.full_name && !customerName) setCustomerName(user.full_name);
    if (user?.phone && customerPhone === '+998 ') setCustomerPhone(user.phone);
  }, [user, customerName, customerPhone]);

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/v1/products?limit=100')
      .then((r) => r.json())
      .then((pRes) => {
        if (!mounted) return;
        if (pRes?.success && Array.isArray(pRes.products)) {
          const map: Record<string, CheckoutProduct> = {};
          pRes.products.forEach((p: CheckoutProduct) => {
            map[p.id] = p;
          });
          setProductsMap(map);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const items = React.useMemo(() => {
    const entries = Object.entries(cart);
    if (entries.length === 0 && directPartId && productsMap[directPartId]) {
      const p = productsMap[directPartId];
      const unitUSD = p.price > 50000 ? Math.round(p.price / 13000) : p.price;
      return [{ product: p, quantity: 1, unitUSD }];
    }
    return entries
      .map(([id, quantity]) => {
        const product = productsMap[id];
        if (!product) return null;
        const unitUSD =
          product.price > 50000 ? Math.round(product.price / 13000) : product.price;
        return { product, quantity, unitUSD };
      })
      .filter(
        (x): x is { product: CheckoutProduct; quantity: number; unitUSD: number } => x !== null
      );
  }, [cart, productsMap, directPartId]);

  const totalUSD = items.reduce((sum, x) => sum + x.unitUSD * x.quantity, 0);
  const depositUSD = Math.max(1, Math.round(totalUSD * 0.03));

  const primaryItem = items[0]?.product;
  const targetSeller = primaryItem?.seller || {
    id: 'seller-1',
    business_name: 'Sardor Tuning Garage',
    phone: '+998 90 945 12 34',
    address: 'Toshkent sh., Sergeli tumani, Avtosalon ko‘chasi 14-ustaxona',
  };

  const handlePayAndUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMsg('Iltimos, ismingizni kiriting.');
      return;
    }
    const cleanDigits = customerPhone.replace(/\D/g, '');
    if (cleanDigits.length < 9) {
      setErrorMsg('Iltimos, telefon raqamingizni to‘liq kiriting (ustaxona siz bilan bog‘lanishi uchun).');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Detal tanlanmagan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          preferredDate: new Date().toISOString().slice(0, 10),
          paymentMethod,
          studioId: targetSeller.id,
          studioName: targetSeller.business_name,
          totalPriceUSD: totalUSD,
          depositUSD,
          items: items.map((x) => ({
            id: x.product.id,
            name: x.product.name,
            brand: x.product.brand,
            price: x.unitUSD,
            quantity: x.quantity,
            image: x.product.image,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'To‘lovni tasdiqlashda xatolik yuz berdi');
      }

      const newLead: UnlockedWorkshopLead = {
        id: data.order?.voucherCode || `#CV-${Math.floor(1000 + Math.random() * 9000)}`,
        partName: items.map((i) => i.product.name).join(', '),
        partImage: primaryItem?.image || '/assets/wheel-CiWWvvai.jpg',
        targetCar: primaryItem?.targetCar || 'Chevrolet Gentra',
        partPriceUSD: totalUSD,
        depositPaidUSD: depositUSD,
        workshopName: targetSeller.business_name || 'Sardor Tuning Garage',
        workshopAddress:
          targetSeller.address || 'Toshkent sh., Sergeli tumani, Avtosalon ko‘chasi 14-ustaxona',
        workshopPhone: targetSeller.phone || '+998 90 945 12 34',
        customerPhone: customerPhone.trim(),
        unlockedAt: new Date().toLocaleDateString('uz-UZ', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      try {
        const existingRaw = localStorage.getItem('carvision_unlocked_leads');
        const existing: UnlockedWorkshopLead[] = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem(
          'carvision_unlocked_leads',
          JSON.stringify([newLead, ...existing.slice(0, 19)])
        );
      } catch {
        // Ignore storage error
      }

      setUnlockedLead(newLead);
      clearCart();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VeloceShell>
      <div className="mx-auto max-w-3xl px-5 pt-6 pb-24 md:px-10 md:pt-10">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/${locale}/shop`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/80 transition hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#D4AE62]">
              3% Zakalat To‘lovi
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-light text-white md:text-3xl">
              {unlockedLead
                ? 'Ustaxona Manzili Ochildi!'
                : 'Tuning Servis Manzilini Ochish'}
            </h1>
          </div>
        </div>

        {unlockedLead ? (
          /* UNLOCKED WORKSHOP ADDRESS SCREEN */
          <div className="space-y-8 rounded-3xl bg-[#12151E] p-6 sm:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  3% Zakalat Qabul Qilindi · Ustaxonaga Xabar Yuborildi
                </span>
                <h2 className="mt-1 font-display text-2xl font-light text-white sm:text-3xl">
                  {unlockedLead.workshopName}
                </h2>
                <p className="mt-1 text-xs text-white/60 sm:text-sm">
                  Sizning <strong className="text-white">{unlockedLead.customerPhone}</strong> raqamingiz ustaxonaga yuborildi — xodim sizni kutmoqda.
                </p>
              </div>
            </div>

            {/* Revealed Location & Contact */}
            <div className="space-y-4 rounded-2xl bg-[#0B0C10] p-6">
              <div>
                <p className="text-xs text-white/45">Tuning Servis Aniq Manzili</p>
                <p className="mt-1 flex items-center gap-2 text-base font-medium text-white sm:text-lg">
                  <MapPin className="h-5 w-5 shrink-0 text-[#D4AE62]" />
                  <span>{unlockedLead.workshopAddress}</span>
                </p>
              </div>

              <div className="pt-2">
                <p className="text-xs text-white/45">Ustaxona Telefoni</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#D4AE62]">
                  {unlockedLead.workshopPhone}
                </p>
              </div>

              <div className="pt-2">
                <p className="text-xs text-white/45">Tanlangan Jihoz</p>
                <p className="mt-1 text-sm text-white/90">
                  {unlockedLead.partName} ({unlockedLead.targetCar} uchun)
                </p>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={`tel:${unlockedLead.workshopPhone}`}
                className="shimmer flex items-center justify-center gap-2.5 rounded-2xl bg-gold-gradient py-4 text-xs font-bold tracking-wider uppercase text-black shadow-[0_12px_30px_rgba(212,174,98,0.25)]"
              >
                <Phone className="h-4 w-4" />
                <span>Ustaxonaga Qo‘ng‘iroq Qilish</span>
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unlockedLead.workshopAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-white/[0.06] py-4 text-xs font-semibold tracking-wider uppercase text-white transition hover:bg-white/[0.12]"
              >
                <Navigation className="h-4 w-4 text-[#D4AE62]" />
                <span>Xaritada Yo‘lni Ko‘rish</span>
              </a>
            </div>

            <div className="pt-2 text-center">
              <Link
                href={`/${locale}/profile`}
                className="text-xs text-white/50 underline hover:text-white"
              >
                Barcha ochilgan manzillarimni profilimda ko‘rish
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="h-72 rounded-3xl bg-white/[0.03] animate-pulse" />
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-white/60">Hozircha detal tanlanmagan.</p>
            <Link
              href={`/${locale}/shop`}
              className="mt-5 inline-block rounded-2xl bg-gold-gradient px-6 py-3 text-xs font-bold uppercase text-black"
            >
              Katalogga O‘tish
            </Link>
          </div>
        ) : (
          /* SIMPLE 3% ADDRESS UNLOCK FORM */
          <form onSubmit={handlePayAndUnlock} className="space-y-8">
            {/* Selected Part Preview (No Seller Name Shown Yet!) */}
            <div className="rounded-3xl bg-[#12151E] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
              <div className="space-y-4">
                {items.map((x) => (
                  <div key={x.product.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={x.product.image}
                        alt={x.product.name}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/wheel-CiWWvvai.jpg';
                        }}
                        className="h-16 w-20 rounded-2xl object-cover bg-[#0B0C10]"
                      />
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#D4AE62]">
                          <Car className="h-3.5 w-3.5" />
                          <span>{x.product.targetCar || 'Chevrolet Gentra'} uchun</span>
                        </span>
                        <h3 className="text-base font-medium text-white">{x.product.name}</h3>
                        <p className="text-xs text-white/50">
                          Ustaxonadagi narxi: {formatPrice(x.unitUSD * x.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#0B0C10] p-4">
                <div className="flex items-center gap-2.5 text-xs text-white/75">
                  <Lock className="h-4 w-4 text-[#D4AE62]" />
                  <span>Manzilni ochish uchun 3% zakalat:</span>
                </div>
                <span className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                  {formatPrice(depositUSD)}
                </span>
              </div>
            </div>

            {/* Simple Customer Phone & Payment Input */}
            <div className="space-y-5 rounded-3xl bg-[#12151E] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
              <div>
                <label className="mb-2 block text-xs text-white/60">Ismingiz</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masalan: Sardor"
                  className="w-full rounded-2xl bg-[#0B0C10] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/60">
                  Telefon raqamingiz (Ustaxona siz bilan bog‘lanishi uchun)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full rounded-2xl bg-[#0B0C10] px-4 py-3.5 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/60">To‘lov tizimi</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Click', 'Payme', 'Uzum'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-2xl py-3 text-xs font-semibold transition cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-[#D4AE62] text-black shadow-[0_6px_20px_rgba(212,174,98,0.3)]'
                          : 'bg-[#0B0C10] text-white/65 hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="shimmer flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gold-gradient py-4 text-xs font-bold tracking-wider uppercase text-black shadow-[0_12px_30px_rgba(212,174,98,0.25)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                <MapPin className="h-4 w-4" />
                <span>
                  {submitting
                    ? 'Manzil ochilmoqda...'
                    : `3% To‘lash (${formatPrice(depositUSD)}) va Manzilni Ochish`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </VeloceShell>
  );
}
