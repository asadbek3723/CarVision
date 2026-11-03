'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Search,
  Phone,
  Calendar,
  User,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useCurrency } from '@/context/CurrencyContext';

interface VoucherOrder {
  id: string;
  orderNumber: string;
  voucherCode: string;
  customerName: string;
  customerPhone: string;
  totalPriceUSD: number;
  totalPriceUZS: number;
  depositUSD: number;
  depositUZS: number;
  remainingUSD: number;
  remainingUZS: number;
  paymentMethod: string;
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  appointmentDate: string;
  primaryItemName: string;
  primaryItemImage: string;
  studioName: string;
}

export default function SellerRedeemVoucherPage() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();

  const [code, setCode] = useState('');
  const [recentOrders, setRecentOrders] = useState<VoucherOrder[]>([]);
  const [matchedOrder, setMatchedOrder] = useState<VoucherOrder | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/seller/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.orders)) {
          setRecentOrders(data.orders);
          if (data.orders[0]) {
            setMatchedOrder(data.orders[0]);
            setCode(data.orders[0].orderNumber);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLookup = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (overrideCode ?? code).trim();
    if (!targetCode) return;

    setIsSearching(true);
    setErrorMsg(null);
    setRedeemSuccess(false);

    try {
      const res = await fetch('/api/v1/seller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode, action: 'lookup' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.order) {
        throw new Error(data.error || 'Vaucher kodi topilmadi');
      }
      setMatchedOrder(data.order);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRedeemConfirm = async () => {
    if (!matchedOrder) return;
    setIsRedeeming(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/seller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: matchedOrder.orderNumber, action: 'redeem' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tasdiqlashda xatolik');
      }
      setMatchedOrder(data.order);
      setRedeemSuccess(true);
      setRecentOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <VeloceShell>
      <div className="mx-auto max-w-5xl px-5 pt-6 pb-24 md:px-10 md:pt-10">
        {/* Top Back Navigation */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/seller?tab=dashboard`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#151821] text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition hover:bg-[#1C202B] hover:text-[#D4AE62]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#D4AE62]">
                3% Zakalat Escrow · Mijoz Tashrifi Terminal
              </p>
              <h1 className="mt-1 font-display text-2xl font-light tracking-wide text-white md:text-3xl">
                Vaucherni Tekshirish va Qabul Qilish
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Code Scanner / Lookup + Quick Active Vouchers */}
          <div className="space-y-6 lg:col-span-5">
            <form
              onSubmit={(e) => handleLookup(e)}
              className="rounded-3xl bg-[#13161F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AE62]/15 text-[#D4AE62]">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white">Vaucher yoki Bron Kodi</h2>
                  <p className="text-[11px] text-white/45">
                    Mijozning rasmiy kvitansiyasidagi kodni kiriting
                  </p>
                </div>
              </div>

              <div className="relative mt-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CV-9821 yoki ORD-..."
                  className="w-full rounded-2xl bg-[#0B0C10] px-4 py-4 font-mono text-lg font-bold tracking-[0.2em] uppercase text-[#D4AE62] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/50"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2.5 text-xs font-bold uppercase text-black transition hover:brightness-110 cursor-pointer"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>Tekshirish</span>
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 rounded-xl bg-red-500/15 px-3.5 py-2.5 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Quick Select from Live Active Bookings */}
              {recentOrders.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">
                    Faol Mijoz Bronlari (1-Click Tanlash):
                  </p>
                  <div className="space-y-2">
                    {recentOrders.slice(0, 5).map((ord) => {
                      const active = matchedOrder?.id === ord.id;
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => {
                            setCode(ord.orderNumber);
                            setMatchedOrder(ord);
                            setRedeemSuccess(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-start transition cursor-pointer ${
                            active
                              ? 'bg-[#D4AE62]/15 text-white ring-1 ring-[#D4AE62]/50'
                              : 'bg-[#0B0C10] text-white/70 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div>
                            <span className="font-mono text-xs font-bold text-[#D4AE62]">
                              #{ord.orderNumber}
                            </span>
                            <p className="text-xs text-white/80">{ord.customerName}</p>
                          </div>
                          <div className="text-end">
                            <span className="font-mono text-xs font-semibold text-emerald-400">
                              +{formatPrice(ord.depositUSD)}
                            </span>
                            <p className="text-[10px] uppercase text-white/40">{ord.status}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Official Escrow Certificate & 97% Payout Breakdown */}
          <div className="lg:col-span-7">
            {matchedOrder ? (
              <div className="rounded-3xl bg-[#13161F] p-6 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#D4AE62]">
                        RASMIY ESCROW SERTIFIKATI #{matchedOrder.orderNumber}
                      </span>
                    </div>
                    <h2 className="mt-1 font-display text-xl font-light text-white md:text-2xl">
                      {matchedOrder.primaryItemName}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold tracking-widest uppercase ${
                      matchedOrder.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : matchedOrder.status === 'verified'
                        ? 'bg-[#D4AE62]/15 text-[#D4AE62]'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {matchedOrder.status === 'completed'
                      ? 'O‘RNATILDI VA YAKUNLANDI'
                      : matchedOrder.status === 'verified'
                      ? '3% ZAKALAT TASDIQLANGAN'
                      : 'TEKSHIRILMOQDA'}
                  </span>
                </div>

                {/* Product & Customer Summary */}
                <div className="grid gap-4 rounded-2xl bg-[#0B0C10] p-4 sm:grid-cols-[96px_1fr]">
                  <img
                    src={matchedOrder.primaryItemImage}
                    alt={matchedOrder.primaryItemName}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                  <div className="flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-white/80">
                        <User className="h-3.5 w-3.5 text-[#D4AE62]" />
                        <span>{matchedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Phone className="h-3.5 w-3.5 text-[#D4AE62]" />
                        <span className="font-mono">{matchedOrder.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <Calendar className="h-3.5 w-3.5 text-[#D4AE62]" />
                        <span>{matchedOrder.appointmentDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>To‘lov: {matchedOrder.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Split: 100% Total -> 3% Zakalat Paid -> 97% Studio Direct */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#0B0C10] p-4">
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-white/40">
                      Jami Buyurtma (100%)
                    </p>
                    <p className="mt-1.5 font-mono text-lg font-semibold text-white">
                      {formatPrice(matchedOrder.totalPriceUSD)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-500/[0.08] p-4">
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400">
                      To‘langan 3% Zakalat
                    </p>
                    <p className="mt-1.5 font-mono text-lg font-bold text-emerald-400">
                      {formatPrice(matchedOrder.depositUSD)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-emerald-300/70">
                      Escrow hisobda himoyalangan
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#D4AE62]/[0.1] p-4">
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-[#D4AE62]">
                      Mijoz Ustaxonada To‘laydi (97%)
                    </p>
                    <p className="mt-1.5 font-mono text-lg font-bold text-[#D4AE62]">
                      {formatPrice(matchedOrder.remainingUSD)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#D4AE62]/75">
                      O‘rnatishdan so‘ng naqd/karta
                    </p>
                  </div>
                </div>

                {redeemSuccess && (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-500/15 p-4 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div className="text-xs">
                      <p className="font-semibold">Vaucher Muvaffaqiyatli Qabul Qilindi!</p>
                      <p className="text-emerald-300/80">
                        Buyurtma holati &ldquo;Yakunlandi&rdquo; deb belgilandi. Endi mijozdan qolgan 97% ({formatPrice(matchedOrder.remainingUSD)}) to‘lovni qabul qilishingiz mumkin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <Link
                    href={`/${locale}/seller/orders/${matchedOrder.id}`}
                    className="flex items-center gap-2 rounded-2xl bg-white/[0.05] px-5 py-3.5 text-xs font-semibold tracking-wider uppercase text-white/80 transition hover:bg-white/[0.1]"
                  >
                    <span>To‘liq Buyurtma Tafsiloti</span>
                    <ArrowRight className="h-4 w-4 text-[#D4AE62]" />
                  </Link>

                  <button
                    type="button"
                    disabled={isRedeeming || matchedOrder.status === 'completed'}
                    onClick={handleRedeemConfirm}
                    className="flex items-center gap-2 rounded-2xl bg-gold-gradient px-7 py-3.5 text-xs font-bold tracking-[0.18em] uppercase text-black shadow-[0_10px_30px_rgba(212,174,98,0.35)] transition hover:brightness-110 disabled:opacity-45 cursor-pointer"
                  >
                    {isRedeeming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span>
                      {matchedOrder.status === 'completed'
                        ? 'Vaucher Ishlatilgan'
                        : 'Vaucherni Tasdiqlash va Yopish'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-3xl bg-[#13161F] p-10 text-center">
                <QrCode className="h-12 w-12 text-[#D4AE62]/40" />
                <p className="mt-4 text-sm text-white/60">
                  Mijozning vaucher kodini kiriting yoki chap tomondagi faol bronlardan birini tanlang.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </VeloceShell>
  );
}
