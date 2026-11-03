'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Search,
  PackagePlus,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useCurrency } from '@/context/CurrencyContext';

interface MasterCatalogTemplate {
  id: string;
  name: string;
  brand: string;
  category: string;
  defaultPriceUSD: number;
  defaultStock: number;
  spec: string;
  imageUrl: string;
  compatibility: string[];
}

const MASTER_CATALOG_TEMPLATES: MasterCatalogTemplate[] = [
  {
    id: 'mc-1',
    name: 'BBS CI-R 20" Satin Platinum Forged',
    brand: 'BBS Germany',
    category: 'wheels',
    defaultPriceUSD: 1450,
    defaultStock: 4,
    spec: 'R20 · 5x114.3 · Original Forged Alloy',
    imageUrl: '/images/garage/bbs_wheel.jpg',
    compatibility: ['Chevrolet Malibu 2', 'BYD Song Plus', 'Kia K5'],
  },
  {
    id: 'mc-2',
    name: 'Vossen HF-5 21" Matte Gunmetal',
    brand: 'Vossen Wheels',
    category: 'wheels',
    defaultPriceUSD: 1850,
    defaultStock: 3,
    spec: 'R21 · Hybrid Forged · Deep Concave',
    imageUrl: '/assets/wheel-CiWWvvai.jpg',
    compatibility: ['BYD Han', 'Li Auto L9', 'Zeekr 001', 'Chevrolet Malibu 2'],
  },
  {
    id: 'mc-3',
    name: 'KW Variant 3 Damptronic Coilover',
    brand: 'KW Suspension',
    category: 'lighting',
    defaultPriceUSD: 2100,
    defaultStock: 2,
    spec: '380mm Adjustable · Track Spec Damptronic',
    imageUrl: '/images/garage/kw_suspension.jpg',
    compatibility: ['Chevrolet Malibu 2', 'BYD Han', 'Kia K5', 'Zeekr 001'],
  },
  {
    id: 'mc-4',
    name: 'M-Performance Dry Carbon Aero Lip',
    brand: 'Mansory / M-Perf',
    category: 'body-kits',
    defaultPriceUSD: 780,
    defaultStock: 5,
    spec: 'Pre-Preg Autoclave Dry Carbon · Gloss UV Coat',
    imageUrl: '/images/garage/carbon_lip.jpg',
    compatibility: ['Chevrolet Gentra', 'Chevrolet Malibu 2', 'BYD Chazor'],
  },
  {
    id: 'mc-5',
    name: 'Akrapovič Evolution Line Titanium Exhaust',
    brand: 'Akrapovič',
    category: 'lighting',
    defaultPriceUSD: 1620,
    defaultStock: 6,
    spec: 'Full Titanium System · Carbon Tailpipes',
    imageUrl: '/assets/exhaust-BEQYegnz.jpg',
    compatibility: ['Chevrolet Gentra', 'Chevrolet Cobalt', 'Chevrolet Malibu 2'],
  },
  {
    id: 'mc-6',
    name: 'Alcantara & Carbon Sport Anatomik Salon',
    brand: 'Apex Interior Lab',
    category: 'interior',
    defaultPriceUSD: 1490,
    defaultStock: 5,
    spec: 'Italian Alcantara · Carbon Bucket Seats · Gold Stitch',
    imageUrl: '/assets/interior-DWHEsFIZ.jpg',
    compatibility: ['Chevrolet Malibu 2', 'Chevrolet Gentra', 'Chevrolet Tracker 2'],
  },
  {
    id: 'mc-7',
    name: 'Vorsteiner Carbon Widebody Aero Obves',
    brand: 'Vorsteiner',
    category: 'body-kits',
    defaultPriceUSD: 3400,
    defaultStock: 2,
    spec: 'Full Aero Bodykit · Carbon Diffuser & Side Skirts',
    imageUrl: '/assets/bodykit-CjvcnY7y.jpg',
    compatibility: ['Li Auto L9', 'BYD Song Plus', 'Chevrolet Tahoe'],
  },
  {
    id: 'mc-8',
    name: 'M-Performance Carbon Bucket O‘rindiqlar',
    brand: 'M-Performance Atelier',
    category: 'interior',
    defaultPriceUSD: 2450,
    defaultStock: 4,
    spec: 'Carbon Shell · Track & Street Comfort Fit',
    imageUrl: '/images/garage/m_seats.jpg',
    compatibility: ['Chevrolet Malibu 2', 'BYD Han', 'Zeekr 001'],
  },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Barcha Detallar' },
  { id: 'wheels', label: 'Disklar (Wheels)' },
  { id: 'body-kits', label: 'Kuzov va Obves' },
  { id: 'lighting', label: 'Optika va Tormoz' },
  { id: 'interior', label: 'Salon va Rul' },
];

export default function SellerCatalogImportPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(['mc-1', 'mc-2', 'mc-5']);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(MASTER_CATALOG_TEMPLATES.map((t) => [t.id, t.defaultPriceUSD]))
  );
  const [customStocks, setCustomStocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(MASTER_CATALOG_TEMPLATES.map((t) => [t.id, t.defaultStock]))
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredTemplates = MASTER_CATALOG_TEMPLATES.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.spec.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkImport = async () => {
    if (selectedIds.length === 0) return;
    setIsImporting(true);
    setErrorMsg(null);

    try {
      const bulkItems = MASTER_CATALOG_TEMPLATES.filter((t) => selectedIds.includes(t.id)).map(
        (t) => ({
          name: t.name,
          brand: t.brand,
          category: t.category,
          priceUSD: customPrices[t.id] || t.defaultPriceUSD,
          stock: customStocks[t.id] || t.defaultStock,
          imageUrl: t.imageUrl,
          spec: t.spec,
          compatibility: t.compatibility,
        })
      );

      const res = await fetch('/api/v1/seller/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkItems }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import jarayonida xatolik yuz berdi');
      }

      setImportedCount(data.importedCount || bulkItems.length);
      setTimeout(() => {
        router.push(`/${locale}/seller?tab=dashboard`);
      }, 1300);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <VeloceShell>
      <div className="mx-auto max-w-7xl px-5 pt-6 pb-24 md:px-10 md:pt-10">
        {/* Header */}
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
                1-Click Master Catalog · Tayyor 4K Baza
              </p>
              <h1 className="mt-1 font-display text-2xl font-light tracking-wide text-white md:text-3xl">
                Master Katalogdan Tezkor Import
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  selectedIds.length === MASTER_CATALOG_TEMPLATES.length
                    ? []
                    : MASTER_CATALOG_TEMPLATES.map((t) => t.id)
                )
              }
              className="rounded-2xl bg-[#151821] px-4 py-3 text-xs font-medium text-white/80 transition hover:bg-[#1C202C] cursor-pointer"
            >
              {selectedIds.length === MASTER_CATALOG_TEMPLATES.length
                ? 'Tanlovni Tozalash'
                : 'Barchasini Belgilash'}
            </button>

            <button
              type="button"
              disabled={selectedIds.length === 0 || isImporting}
              onClick={handleBulkImport}
              className="flex items-center gap-2 rounded-2xl bg-gold-gradient px-6 py-3 text-xs font-bold tracking-[0.16em] uppercase text-black shadow-[0_10px_30px_rgba(212,174,98,0.35)] transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackagePlus className="h-4 w-4" />
              )}
              <span>
                {isImporting
                  ? 'Import qilinmoqda...'
                  : `${selectedIds.length} ta Detalni Omborga Qo‘shish`}
              </span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-[#13161F] p-4 md:flex-row md:items-center md:justify-between shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-2xl px-4 py-2 text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4AE62] text-black font-semibold shadow-[0_4px_14px_rgba(212,174,98,0.3)]'
                    : 'bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Brend yoki model qidirish..."
              className="w-full rounded-2xl bg-[#0B0C10] py-2.5 ps-10 pe-4 text-xs text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-2xl bg-red-500/15 px-5 py-3.5 text-xs font-medium text-red-300">
            {errorMsg}
          </div>
        )}

        {importedCount !== null ? (
          <div className="rounded-3xl bg-[#141720] p-12 text-center shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-light text-white">
              {importedCount} ta 4K Detal Omborga Muvaffaqiyatli Qo‘shildi!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Barcha tanlangan mahsulotlar sizning narxingiz va qoldig‘ingiz bilan ustaxona katalogiga biriktirildi.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredTemplates.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const priceUSD = customPrices[item.id] ?? item.defaultPriceUSD;
              const stockVal = customStocks[item.id] ?? item.defaultStock;

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col justify-between rounded-3xl p-4 transition duration-300 ${
                    isSelected
                      ? 'bg-[#171B26] shadow-[0_20px_50px_rgba(212,174,98,0.16)] ring-2 ring-[#D4AE62]/70'
                      : 'bg-[#13161F] shadow-[0_14px_35px_rgba(0,0,0,0.45)] hover:bg-[#161A25]'
                  }`}
                >
                  <div>
                    {/* Image & Select Toggle */}
                    <div
                      onClick={() => toggleSelect(item.id)}
                      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#0B0C10] cursor-pointer"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                      <div className="absolute start-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[9px] font-semibold tracking-wider uppercase text-[#D4AE62] backdrop-blur-md">
                        <Sparkles className="h-2.5 w-2.5" /> 4K PNG Ready
                      </div>

                      <div
                        className={`absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition ${
                          isSelected
                            ? 'bg-[#D4AE62] text-black shadow-lg'
                            : 'bg-black/60 text-white/50'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </div>

                      <div className="absolute bottom-2.5 start-3 end-3 flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-white/75">
                          {item.brand}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#D4AE62]">
                          {formatPrice(priceUSD)}
                        </span>
                      </div>
                    </div>

                    {/* Title & Spec */}
                    <div className="mt-3.5">
                      <h3
                        onClick={() => toggleSelect(item.id)}
                        className="line-clamp-1 text-sm font-medium text-white cursor-pointer"
                      >
                        {item.name}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-white/45">{item.spec}</p>
                    </div>
                  </div>

                  {/* Inline Price & Stock Customizer */}
                  <div className="mt-4 space-y-2.5 rounded-2xl bg-[#0B0C10] p-3">
                    <div className="flex items-center justify-between text-[10px] text-white/45">
                      <span className="flex items-center gap-1">
                        <SlidersHorizontal className="h-3 w-3 text-[#D4AE62]" /> Sizning narxingiz ($)
                      </span>
                      <span>Ombor (dona)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center rounded-xl bg-white/[0.04] px-2.5 py-1.5">
                        <span className="text-xs text-[#D4AE62]">$</span>
                        <input
                          type="number"
                          min="1"
                          value={priceUSD}
                          onChange={(e) =>
                            setCustomPrices((prev) => ({
                              ...prev,
                              [item.id]: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-full bg-transparent ps-1 font-mono text-xs font-semibold text-white focus:outline-none"
                        />
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={stockVal}
                        onChange={(e) =>
                          setCustomStocks((prev) => ({
                            ...prev,
                            [item.id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="rounded-xl bg-white/[0.04] px-3 py-1.5 text-center font-mono text-xs font-semibold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </VeloceShell>
  );
}
