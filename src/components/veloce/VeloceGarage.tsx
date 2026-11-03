'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus,
  Minus,
  Trash2,
  Camera,
  Car,
} from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';

interface GaragePart {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceUSD: number;
  stock: number;
  spec: string;
  image: string;
}

const FALLBACK_GARAGE_PARTS: GaragePart[] = [
  {
    id: 'vp-1',
    name: 'BBS CI-R 20" Satin Platinum Forged',
    brand: 'BBS Germany',
    category: 'Disklar',
    priceUSD: 1450,
    stock: 4,
    spec: 'Chevrolet Malibu 2 · R20 · 5x114.3',
    image: '/images/garage/bbs_wheel.jpg',
  },
  {
    id: 'vp-2',
    name: 'Vossen HF-5 21" Matte Gunmetal',
    brand: 'Vossen Wheels',
    category: 'Disklar',
    priceUSD: 1850,
    stock: 3,
    spec: 'BYD Song Plus · R21 · Hybrid Forged',
    image: '/assets/wheel-CiWWvvai.jpg',
  },
  {
    id: 'vp-3',
    name: 'KW Variant 3 Damptronic Coilover',
    brand: 'KW Suspension',
    category: 'Podveska',
    priceUSD: 2100,
    stock: 2,
    spec: 'Kia K5 · 380mm Adjustable',
    image: '/images/garage/kw_suspension.jpg',
  },
  {
    id: 'vp-4',
    name: 'M-Performance Dry Carbon Aero Lip',
    brand: 'Mansory / M-Perf',
    category: 'Kuzov va Obves',
    priceUSD: 780,
    stock: 5,
    spec: 'Chevrolet Gentra · Pre-Preg Dry Carbon',
    image: '/images/garage/carbon_lip.jpg',
  },
];

export function VeloceGarage() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { openCamera } = useVeloceStore();
  const { formatPrice } = useCurrency();

  const [inventory, setInventory] = React.useState<GaragePart[]>(FALLBACK_GARAGE_PARTS);
  const [studioName, setStudioName] = React.useState('Tuning Ustaxonasi');
  const [activeCategory, setActiveCategory] = React.useState('Barchasi');

  React.useEffect(() => {
    fetch('/api/v1/seller/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          const mapped: GaragePart[] = data.products.map(
            (p: {
              id: string;
              name: string;
              brand?: string;
              category?: string;
              priceUSD?: number;
              price?: number;
              stock?: number;
              spec?: string;
              image?: string;
            }) => ({
              id: p.id,
              name: p.name,
              brand: p.brand || 'Custom Studio',
              category: p.category || 'Disklar',
              priceUSD:
                p.priceUSD ??
                (Number(p.price) > 50000
                  ? Math.round(Number(p.price) / 13000)
                  : Number(p.price) || 450),
              stock: p.stock ?? 3,
              spec: p.spec || 'Chevrolet Gentra · Original Fitment',
              image: p.image || '/images/garage/bbs_wheel.jpg',
            })
          );
          setInventory(mapped);
        }
        if (data?.seller?.business_name) {
          setStudioName(data.seller.business_name);
        }
      })
      .catch(() => {});
  }, []);

  const categories = React.useMemo(() => {
    const set = new Set<string>(['Barchasi']);
    inventory.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [inventory]);

  const filteredItems = React.useMemo(() => {
    return inventory.filter(
      (item) => activeCategory === 'Barchasi' || item.category === activeCategory
    );
  }, [inventory, activeCategory]);

  const handleStockUpdate = async (productId: string, nextStock: number) => {
    const clamped = Math.max(0, nextStock);
    setInventory((prev) =>
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

  const handleDelete = async (productId: string) => {
    setInventory((prev) => prev.filter((p) => p.id !== productId));
    try {
      await fetch(`/api/v1/seller/inventory?productId=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore
    }
  };

  const getSingleCarName = (item: GaragePart) => {
    const text = `${item.name} ${item.spec}`.toLowerCase();
    if (text.includes('malibu')) return 'Chevrolet Malibu 2';
    if (text.includes('cobalt')) return 'Chevrolet Cobalt';
    if (text.includes('tracker')) return 'Chevrolet Tracker 2';
    if (text.includes('monza')) return 'Chevrolet Monza';
    if (text.includes('song')) return 'BYD Song Plus';
    if (text.includes('chazor') || text.includes('byd')) return 'BYD Chazor';
    if (text.includes('k5') || text.includes('kia')) return 'Kia K5';
    return 'Chevrolet Gentra';
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pt-6 pb-28 md:px-10 md:pt-10">
      {/* Simple Boxless Header */}
      <div className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-[#D4AE62]">
            Ombor va Detallar
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
            <span>Mijoz Mashinasida Sinash</span>
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

      {/* Category Pills (No Wrapper Box) */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-2xl px-4 py-2.5 text-xs font-medium transition cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#D4AE62] text-black font-semibold'
                : 'bg-white/[0.04] text-white/65 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Clean Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filteredItems.map((item) => {
          const carName = getSingleCarName(item);
          return (
            <div key={item.id} className="group flex flex-col justify-between">
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#11131A] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(e) => {
                      const hint = `${item.category} ${item.name}`.toLowerCase();
                      if (hint.includes('bamper') || hint.includes('lip') || hint.includes('body')) {
                        e.currentTarget.src = '/images/garage/carbon_lip.jpg';
                      } else if (hint.includes('salon') || hint.includes('interior')) {
                        e.currentTarget.src = '/images/garage/m_seats.jpg';
                      } else if (hint.includes('podveska') || hint.includes('suspension')) {
                        e.currentTarget.src = '/images/garage/kw_suspension.jpg';
                      } else {
                        e.currentTarget.src = '/images/garage/bbs_wheel.jpg';
                      }
                    }}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white/55 transition hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                    title="O‘chirish"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D4AE62]">
                    <Car className="h-3.5 w-3.5" />
                    <span>{carName} uchun</span>
                  </span>
                  <h3 className="mt-0.5 line-clamp-1 text-sm font-medium text-white">
                    {item.name}
                  </h3>
                  <p className="mt-1 font-mono text-sm font-bold text-white/90 tabular-nums">
                    {formatPrice(item.priceUSD)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => handleStockUpdate(item.id, item.stock - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded text-white/70 hover:bg-white/[0.1] cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[22px] text-center font-mono text-xs font-bold text-white">
                    {item.stock}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStockUpdate(item.id, item.stock + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded text-white/70 hover:bg-white/[0.1] cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <Link
                  href={`/${locale}/customize?partId=${encodeURIComponent(item.id)}`}
                  className="text-xs font-semibold text-[#D4AE62] hover:underline"
                >
                  Sinab ko‘rish →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
