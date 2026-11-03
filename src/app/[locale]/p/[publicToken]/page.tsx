'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Share2,
  Check,
  SlidersHorizontal,
  ShoppingBag,
  MapPin,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useCurrency } from '@/context/CurrencyContext';
import { useVeloceStore } from '@/context/VeloceStore';

export default function DigitalTuningPassportPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const publicToken = (params?.['publicToken'] as string) || 'CV-4K-9821';
  const { formatPrice } = useCurrency();
  const { add } = useVeloceStore();

  const [sliderPos, setSliderPos] = useState(55);
  const [copied, setCopied] = useState(false);

  const beforeImg = '/assets/hero-car-1-Bi4wq3bK.jpg';
  const afterImg = '/assets/hero-car-2-D9p-X9x5.jpg';

  const passportParts = [
    {
      id: 'vp-1',
      name: 'BBS CI-R 20" Satin Platinum Forged',
      brand: 'BBS Germany',
      spec: 'R20 · 5x114.3 · Original Forged Alloy',
      priceUSD: 1450,
      image: '/images/garage/bbs_wheel.jpg',
    },
    {
      id: 'vp-4',
      name: 'M-Performance Dry Carbon Aero Diffuser',
      brand: 'Mansory / M-Perf',
      spec: 'Pre-Preg Autoclave Dry Carbon',
      priceUSD: 780,
      image: '/images/garage/diffuser.jpg',
    },
  ];

  const totalUSD = passportParts.reduce((s, p) => s + p.priceUSD, 0);
  const depositUSD = Math.round(totalUSD * 0.03);

  const handleBookSet = () => {
    passportParts.forEach((p) => {
      add(p.id);
    });
    router.push(`/${locale}/cart/checkout`);
  };

  const handleCopyShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <VeloceShell>
      <div className="mx-auto max-w-6xl px-5 pt-6 pb-24 md:px-10 md:pt-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/customize`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#151821] text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition hover:bg-[#1C202B] hover:text-[#D4AE62]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#D4AE62]">
                Rasmiy 4K Raqamli Tuning Pasporti · #{publicToken.toUpperCase()}
              </p>
              <h1 className="mt-1 font-display text-2xl font-light tracking-wide text-white md:text-3xl">
                Maxsus 4K AI Fitment Loyihasi
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyShare}
            className="flex items-center gap-2 rounded-2xl bg-[#151821] px-4 py-2.5 text-xs font-medium text-[#D4AE62] transition hover:bg-[#1C202C] cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span>{copied ? 'Havola Nusxalandi' : 'Pasportni Ulashish'}</span>
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left 7 Cols: Interactive Before/After 4K Stage */}
          <div className="space-y-4 lg:col-span-7">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-[#0B0C10] shadow-[0_24px_60px_rgba(0,0,0,0.65)] select-none">
              <img
                src={afterImg}
                alt="After 4K Tuning"
                className="h-full w-full object-cover"
              />

              <div
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                className="
                  absolute inset-0 overflow-hidden
                "
              >
                <img
                  src={beforeImg}
                  alt="Before Stock"
                  className="h-full w-full object-cover brightness-90"
                />
              </div>

              {/* Divider Line */}
              <div
                style={{ left: `${sliderPos}%` }}
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#D4AE62] shadow-[0_0_20px_rgba(212,174,98,0.9)]"
              >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-black shadow-lg">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
              </div>

              <input
                type="range"
                min={5}
                max={95}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                aria-label="Before and After comparison slider"
                className="absolute inset-0 h-full w-full opacity-0 cursor-ew-resize"
              />

              <span className="pointer-events-none absolute start-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase text-white/80 backdrop-blur-md">
                Zavod Holati (Oldin)
              </span>
              <span className="pointer-events-none absolute end-4 top-4 rounded-full bg-[#D4AE62] px-3 py-1 text-[10px] font-bold uppercase text-black">
                4K AI Tuning (Keyin)
              </span>
            </div>
          </div>

          {/* Right 5 Cols: Spec Sheet & 1-Click 3% Escrow Booking */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl bg-[#13161F] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AE62]">
                  Qo‘llanilgan 4K Detallar
                </span>
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <MapPin className="h-3.5 w-3.5 text-[#D4AE62]" /> Apex Customs Atelier
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {passportParts.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#0B0C10] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={part.image}
                        alt={part.name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-xs font-medium text-white">{part.name}</p>
                        <p className="mt-0.5 text-[10px] text-white/45">{part.spec}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#D4AE62] tabular-nums">
                      {formatPrice(part.priceUSD)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-[#0B0C10] p-4">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Jami loyiha qiymati (100%):</span>
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {formatPrice(totalUSD)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-[#D4AE62]">
                  <span>3% Zakalat bilan band qilish:</span>
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {formatPrice(depositUSD)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2.5 text-[11px] text-emerald-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>97% to‘lov ustaxonada o‘rnatish yakunlangach amalga oshiriladi</span>
              </div>

              <button
                type="button"
                onClick={handleBookSet}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient py-4 text-xs font-bold tracking-[0.18em] uppercase text-black shadow-[0_12px_32px_rgba(212,174,98,0.35)] transition hover:brightness-110 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Ushbu To‘plamni 3% Zakalat Bilan Bron Qilish</span>
              </button>

              <Link
                href={`/${locale}/customize`}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.05] py-3.5 text-xs font-semibold uppercase text-white/80 transition hover:bg-white/[0.1]"
              >
                <Sparkles className="h-4 w-4 text-[#D4AE62]" />
                <span>O‘z Mashinamda Sinab Ko‘rish</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </VeloceShell>
  );
}
