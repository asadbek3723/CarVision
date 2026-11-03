'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Phone,
  Plus,
  Minus,
  Trash2,
  Camera,
  Check,
  Car,
  Users,
  Package,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useVeloceStore } from '@/context/VeloceStore';

interface SellerLead {
  id: string;
  voucherCode: string;
  customerName: string;
  customerPhone: string;
  partName: string;
  partImage: string;
  totalPriceUSD: number;
  depositUSD: number;
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  createdAt: string;
}

interface SellerPart {
  id: string;
  name: string;
  brand: string;
  priceUSD: number;
  spec: string;
  category: string;
  image: string;
  stock: number;
}

export function SellerDashboardView() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();
  const { openCamera } = useVeloceStore();

  const [activeTab, setActiveTab] = useState<'leads' | 'parts'>('leads');
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [parts, setParts] = useState<SellerPart[]>([]);
  const [studioName, setStudioName] = useState<string>('Tuning Ustaxonasi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/api/v1/seller/orders').then((r) => r.json()).catch(() => null),
      fetch('/api/v1/seller/inventory').then((r) => r.json()).catch(() => null),
    ])
      .then(([ordersRes, invRes]) => {
        if (!mounted) return;
        if (ordersRes?.success && Array.isArray(ordersRes.orders)) {
          setLeads(ordersRes.orders);
        }
        if (invRes?.success) {
          if (Array.isArray(invRes.products)) {
            setParts(invRes.products);
          }
          if (invRes.seller?.business_name) {
            setStudioName(invRes.seller.business_name);
          }
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleMarkContacted = async (orderId: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === orderId ? { ...l, status: 'completed' } : l))
    );
    try {
      await fetch('/api/v1/seller/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'completed' }),
      });
    } catch {
      // Ignore network error
    }
  };

  const handleStockChange = async (productId: string, nextStock: number) => {
    const clamped = Math.max(0, nextStock);
    setParts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: clamped } : p))
    );
    try {
      await fetch('/api/v1/seller/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, stock: clamped }),
      });
    } catch {
      // Ignore
    }
  };

  const handleRemovePart = async (productId: string) => {
    setParts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await fetch(`/api/v1/seller/inventory?productId=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore
    }
  };

  const getSingleCarName = (part: SellerPart) => {
    const text = `${part.name} ${part.spec || ''}`.toLowerCase();
    if (text.includes('malibu')) return 'Chevrolet Malibu 2';
    if (text.includes('cobalt')) return 'Chevrolet Cobalt';
    if (text.includes('tracker')) return 'Chevrolet Tracker 2';
    if (text.includes('monza')) return 'Chevrolet Monza';
    if (text.includes('song')) return 'BYD Song Plus';
    if (text.includes('chazor') || text.includes('byd')) return 'BYD Chazor';
    if (text.includes('k5') || text.includes('kia')) return 'Kia K5';
    return 'Chevrolet Gentra';
  };

  const newLeadsCount = leads.filter((l) => l.status !== 'completed' && l.status !== 'cancelled').length;

  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-28 md:px-10 md:pt-10">
      {/* Simple, Boxless Top Header */}
      <div className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-[#D4AE62]">
            Ustaxona Boshqaruvi
          </p>
          <h1 className="mt-1 font-display text-2xl font-light text-white sm:text-4xl">
            {studioName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCamera}
            className="flex items-center gap-2 rounded-2xl bg-white/[0.06] px-5 py-3.5 text-xs font-semibold text-white transition hover:bg-white/[0.12] cursor-pointer"
          >
            <Camera className="h-4 w-4 text-[#D4AE62]" />
            <span>Mijoz Mashinasini Rasmga Olish</span>
          </button>

          <Link
            href={`/${locale}/seller/new-part`}
            className="shimmer flex items-center gap-2 rounded-2xl bg-gold-gradient px-6 py-3.5 text-xs font-bold uppercase text-black shadow-[0_10px_28px_rgba(212,174,98,0.25)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            <span>Detal Qo‘shish</span>
          </Link>
        </div>
      </div>

      {/* Ultra-Simple 2-Button Switcher (No Clutter) */}
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'leads'
              ? 'bg-[#D4AE62] text-black shadow-[0_8px_24px_rgba(212,174,98,0.3)]'
              : 'bg-white/[0.04] text-white/65 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Mijozlar ({leads.length})</span>
          {newLeadsCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'leads'
                  ? 'bg-black/20 text-black'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {newLeadsCount} yangi
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parts')}
          className={`flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'parts'
              ? 'bg-[#D4AE62] text-black shadow-[0_8px_24px_rgba(212,174,98,0.3)]'
              : 'bg-white/[0.04] text-white/65 hover:text-white'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Mening Detallarim ({parts.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'leads' ? (
        /* SECTION 1: CUSTOMERS WHO EXPRESSED INTEREST (3% PAID) */
        <div>
          {leads.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base text-white/60">
                Hozircha yangi mijoz so‘rovlari yo‘q.
              </p>
              <p className="mt-1 text-xs text-white/40">
                Mijoz sizning detalingizga 3% zakalat to‘laganda uning telefon raqami shu yerda chiqadi.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {leads.map((lead) => {
                const isDone = lead.status === 'completed';
                return (
                  <div
                    key={lead.id}
                    className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={lead.partImage}
                        alt={lead.partName}
                        onError={(e) => {
                          e.currentTarget.src = '/images/garage/bbs_wheel.jpg';
                        }}
                        className="h-16 w-20 shrink-0 rounded-2xl object-cover bg-[#12141C]"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-white">
                            {lead.customerName}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              isDone
                                ? 'bg-white/[0.06] text-white/50'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {isDone ? 'Gaplashildi' : '3% Zakalat to‘landi — Sizni kutmoqda'}
                          </span>
                        </div>

                        <p className="mt-1 font-mono text-base font-bold text-[#D4AE62]">
                          {lead.customerPhone}
                        </p>

                        <p className="mt-1 text-xs text-white/65">
                          Qiziqqan jihozi: <strong className="text-white">{lead.partName}</strong> · Narxi: {formatPrice(lead.totalPriceUSD)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${lead.customerPhone}`}
                        className="flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3 text-xs font-bold uppercase text-black transition hover:brightness-110"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Qo‘ng‘iroq Qilish</span>
                      </a>

                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => handleMarkContacted(lead.id)}
                          className="flex items-center gap-1.5 rounded-2xl bg-white/[0.06] px-4 py-3 text-xs font-medium text-white/80 transition hover:bg-white/[0.12] cursor-pointer"
                        >
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>Gaplashildi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* SECTION 2: MY PARTS (WAREHOUSE) */
        <div>
          {parts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base text-white/60">
                Omboringizda hozircha detallar yo‘q.
              </p>
              <Link
                href={`/${locale}/seller/new-part`}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-6 py-3.5 text-xs font-bold uppercase text-black"
              >
                <Plus className="h-4 w-4" />
                <span>Birinchi Detalni Qo‘shish</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {parts.map((item) => {
                const carName = getSingleCarName(item);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.src = '/images/garage/bbs_wheel.jpg';
                        }}
                        className="h-16 w-20 shrink-0 rounded-2xl object-cover bg-[#12141C]"
                      />
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D4AE62]">
                          <Car className="h-3.5 w-3.5" />
                          <span>{carName} uchun</span>
                        </span>
                        <h3 className="mt-0.5 text-base font-medium text-white">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-white/80 tabular-nums">
                          {formatPrice(item.priceUSD)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5">
                        <span className="text-xs text-white/45 me-1">Soni:</span>
                        <button
                          type="button"
                          onClick={() => handleStockChange(item.id, item.stock - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-white hover:bg-white/[0.12] cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[24px] text-center font-mono text-xs font-bold text-white">
                          {item.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStockChange(item.id, item.stock + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-white hover:bg-white/[0.12] cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePart(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                        title="O‘chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
