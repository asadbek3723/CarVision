'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  MapPin,
  Loader2,
  Printer,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useCurrency } from '@/context/CurrencyContext';

interface OrderItemDetail {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  product_image_url?: string | null;
}

interface SellerOrderDetail {
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
  itemsCount: number;
  primaryItemName: string;
  primaryItemImage: string;
  studioName: string;
  studioAddress: string;
  studioPhone: string;
  note: string;
  createdAt: string;
  items: OrderItemDetail[];
}

export default function SellerOrderDetailPage() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const orderId = params?.['orderId'] as string;
  const { formatPrice } = useCurrency();

  const [order, setOrder] = useState<SellerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/v1/seller/orders?orderId=${encodeURIComponent(orderId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.order) {
          setOrder(data.order);
        } else if (data?.success && Array.isArray(data.orders) && data.orders[0]) {
          setOrder(data.orders[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: 'pending' | 'verified' | 'completed' | 'cancelled') => {
    if (!order) return;
    setUpdatingStatus(newStatus);
    try {
      const res = await fetch('/api/v1/seller/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, status: newStatus }),
      });
      const data = await res.json();
      if (data?.success && data.order) {
        setOrder(data.order);
      }
    } catch {
      // ignore
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <VeloceShell>
      <div className="mx-auto max-w-5xl px-5 pt-6 pb-24 md:px-10 md:pt-10">
        {/* Back Header */}
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
                Buyurtma Pasporti · 3% Zakalat Garant
              </p>
              <h1 className="mt-1 font-display text-2xl font-light tracking-wide text-white md:text-3xl">
                {order ? `Bron #${order.orderNumber}` : 'Buyurtma Tafsilotlari'}
              </h1>
            </div>
          </div>

          {order && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-2xl bg-[#151821] px-4 py-2.5 text-xs font-medium text-white/80 transition hover:bg-[#1C202C] cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#D4AE62]" />
              <span>Sertifikatni Chop Etish</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-3xl bg-[#13161F]">
            <Loader2 className="h-8 w-8 animate-spin text-[#D4AE62]" />
          </div>
        ) : !order ? (
          <div className="rounded-3xl bg-[#13161F] p-12 text-center">
            <p className="text-sm text-white/60">Buyurtma topilmadi.</p>
            <Link
              href={`/${locale}/seller?tab=dashboard`}
              className="mt-4 inline-block rounded-2xl bg-gold-gradient px-6 py-3 text-xs font-bold uppercase text-black"
            >
              Dashboardga Qaytish
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left 7 Columns: Items & Status Pipeline */}
            <div className="space-y-6 lg:col-span-7">
              {/* Status Stepper Card */}
              <div className="rounded-3xl bg-[#13161F] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50">
                    Buyurtma va O‘rnatish Bosqichi
                  </span>
                  <span
                    className={`rounded-full px-3.5 py-1 text-[10px] font-bold tracking-widest uppercase ${
                      order.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : order.status === 'verified'
                        ? 'bg-[#D4AE62]/15 text-[#D4AE62]'
                        : order.status === 'cancelled'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {order.status === 'completed'
                      ? 'O‘RNATILDI (YAKUNLANDI)'
                      : order.status === 'verified'
                      ? 'ZAKALAT TASDIQLANGAN'
                      : order.status === 'cancelled'
                      ? 'BEKOR QILINGAN'
                      : 'KUTILMOQDA'}
                  </span>
                </div>

                {/* 3-Step Visual Progress */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div
                    className={`rounded-2xl p-3.5 ${
                      order.status !== 'cancelled'
                        ? 'bg-[#D4AE62]/15 text-[#D4AE62]'
                        : 'bg-[#0B0C10] text-white/40'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <p className="mt-2 text-xs font-semibold">1. Bron Tushdi</p>
                    <p className="mt-0.5 text-[10px] opacity-75">3% Zakalat yuborildi</p>
                  </div>

                  <div
                    className={`rounded-2xl p-3.5 ${
                      order.status === 'verified' || order.status === 'completed'
                        ? 'bg-[#D4AE62]/15 text-[#D4AE62]'
                        : 'bg-[#0B0C10] text-white/40'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <p className="mt-2 text-xs font-semibold">2. Tasdiqlandi</p>
                    <p className="mt-0.5 text-[10px] opacity-75">Vaqt va ombor band qilindi</p>
                  </div>

                  <div
                    className={`rounded-2xl p-3.5 ${
                      order.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-[#0B0C10] text-white/40'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="mt-2 text-xs font-semibold">3. Yakunlandi</p>
                    <p className="mt-0.5 text-[10px] opacity-75">97% to‘lov qabul qilindi</p>
                  </div>
                </div>

                {/* Instant Status Mutation Buttons */}
                <div className="mt-6 flex flex-wrap gap-3 pt-2">
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      disabled={updatingStatus !== null}
                      onClick={() => handleStatusUpdate('verified')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3.5 text-xs font-bold tracking-wider uppercase text-black shadow-[0_10px_25px_rgba(212,174,98,0.3)] transition hover:brightness-110 cursor-pointer"
                    >
                      {updatingStatus === 'verified' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      <span>Bronni Tasdiqlash (3% Zakalat)</span>
                    </button>
                  )}

                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      type="button"
                      disabled={updatingStatus !== null}
                      onClick={() => handleStatusUpdate('completed')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-xs font-bold tracking-wider uppercase text-black shadow-[0_10px_25px_rgba(16,185,129,0.25)] transition hover:brightness-110 cursor-pointer"
                    >
                      {updatingStatus === 'completed' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span>O‘rnatildi va 97% Qabul Qilindi</span>
                    </button>
                  )}

                  {order.status !== 'cancelled' && order.status !== 'completed' && (
                    <button
                      type="button"
                      disabled={updatingStatus !== null}
                      onClick={() => handleStatusUpdate('cancelled')}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-500/15 px-4 py-3.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/25 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Bekor Qilish</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ordered Parts List */}
              <div className="rounded-3xl bg-[#13161F] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50">
                  Buyurtma Qilingan Detallar ({order.items.length || 1} ta)
                </span>

                <div className="mt-4 space-y-3">
                  {(order.items.length > 0
                    ? order.items
                    : [
                        {
                          id: 'primary',
                          product_name: order.primaryItemName,
                          price: order.totalPriceUSD,
                          quantity: 1,
                          product_image_url: order.primaryItemImage,
                        },
                      ]
                  ).map((item) => {
                    const rawItemPrice = Number(item.price) || order.totalPriceUSD;
                    const itemUSD =
                      rawItemPrice > 50000 ? Math.round(rawItemPrice / 13000) : rawItemPrice;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-[#0B0C10] p-4"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={item.product_image_url || order.primaryItemImage}
                            alt={item.product_name}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                          <div>
                            <h3 className="text-sm font-medium text-white">{item.product_name}</h3>
                            <p className="mt-1 text-xs text-white/45">
                              Miqdori: {item.quantity} to‘plam · 4K Studio Fitment
                            </p>
                          </div>
                        </div>

                        <div className="text-end font-mono text-sm font-semibold text-[#D4AE62]">
                          {formatPrice(itemUSD * (item.quantity || 1))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Customer Dossier & Escrow Financial Ledger */}
            <div className="space-y-6 lg:col-span-5">
              {/* Customer Card */}
              <div className="rounded-3xl bg-[#13161F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50">
                  Mijoz Ma’lumotlari
                </span>

                <div className="mt-4 space-y-3.5">
                  <div className="flex items-center justify-between rounded-2xl bg-[#0B0C10] px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-white/50">
                      <User className="h-4 w-4 text-[#D4AE62]" /> Mijoz
                    </span>
                    <span className="text-sm font-medium text-white">{order.customerName}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#0B0C10] px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-white/50">
                      <Phone className="h-4 w-4 text-[#D4AE62]" /> Telefon
                    </span>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="font-mono text-sm font-semibold text-[#D4AE62] hover:underline"
                    >
                      {order.customerPhone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#0B0C10] px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-white/50">
                      <Calendar className="h-4 w-4 text-[#D4AE62]" /> Tashrif sanasi
                    </span>
                    <span className="text-xs font-medium text-white">{order.appointmentDate}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#0B0C10] px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-white/50">
                      <MapPin className="h-4 w-4 text-[#D4AE62]" /> Ustaxona
                    </span>
                    <span className="text-xs font-medium text-white">{order.studioName}</span>
                  </div>
                </div>
              </div>

              {/* Financial Split Ledger */}
              <div className="rounded-3xl bg-[#13161F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50">
                  Moliyaviy Hisob-Kitob (3% / 97%)
                </span>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-[#0B0C10] p-4">
                    <div>
                      <p className="text-xs text-white/60">Jami Buyurtma Qiymati (100%)</p>
                      <p className="text-[10px] text-white/35">Detal + O‘rnatish kafolati</p>
                    </div>
                    <span className="font-mono text-base font-semibold text-white">
                      {formatPrice(order.totalPriceUSD)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-emerald-500/[0.08] p-4">
                    <div>
                      <p className="text-xs font-medium text-emerald-400">
                        To‘langan 3% Zakalat ({order.paymentMethod})
                      </p>
                      <p className="text-[10px] text-emerald-300/65">
                        CarVision Escrow hisobida
                      </p>
                    </div>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {formatPrice(order.depositUSD)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#D4AE62]/[0.12] p-4">
                    <div>
                      <p className="text-xs font-semibold text-[#D4AE62]">
                        Ustaxonada Qabul Qilinadi (97%)
                      </p>
                      <p className="text-[10px] text-[#D4AE62]/75">
                        Mijozdan to‘g‘ridan-to‘g‘ri olasiz
                      </p>
                    </div>
                    <span className="font-mono text-lg font-bold text-[#D4AE62]">
                      {formatPrice(order.remainingUSD)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </VeloceShell>
  );
}
