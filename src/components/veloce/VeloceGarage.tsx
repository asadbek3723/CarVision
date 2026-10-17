'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/veloce/ProductCard';
import { VELOCE_PRODUCTS, VELOCE_CATEGORIES } from '@/domain/veloce-catalog';

const GARAGE_ITEM_IDS = ['p2', 'p9', 'p17', 'p24', 'p30', 'p35', 'p10', 'p25'];

export function VeloceGarage() {
  const [selectedCat, setSelectedCat] = React.useState('All');

  const garageProducts = React.useMemo(() => {
    return VELOCE_PRODUCTS.filter(
      (p) =>
        GARAGE_ITEM_IDS.includes(p.id) &&
        (selectedCat === 'All' || p.category === selectedCat)
    );
  }, [selectedCat]);

  const categories = ['All', ...VELOCE_CATEGORIES.filter((c) => c !== 'Color')];

  return (
    <div>
      {/* Garage Hero Section */}
      <section className="relative h-[420px] overflow-hidden md:h-[520px] lg:h-[620px]">
        <img
          src="/assets/garage-Bst4bQtu.jpg"
          alt="Your car in the garage"
          width={1920}
          height={1088}
          className="reveal absolute inset-0 h-full w-full object-cover object-[70%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

        <div className="relative mx-auto flex h-full max-w-[1500px] flex-col justify-center px-6 md:px-10 lg:px-14">
          <p className="rise text-[10px] tracking-[0.5em] text-foreground/80 uppercase">
            Your Garage
          </p>
          <h1
            className="rise mt-4 font-display text-[28px] font-extralight leading-[1.2] tracking-[0.12em] md:text-5xl lg:text-6xl text-white"
            style={{ animationDelay: '120ms' }}
          >
            ALL YOUR
            <br />
            <span className="font-normal text-gold-gradient">MODIFICATIONS</span>
            <br />
            IN ONE PLACE
          </h1>
          <p
            className="rise mt-5 text-sm text-foreground/80"
            style={{ animationDelay: '220ms' }}
          >
            Track <span className="mx-2 text-primary">•</span> Customize{' '}
            <span className="mx-2 text-primary">•</span> Upgrade
          </p>
        </div>
      </section>

      {/* Main Garage Content */}
      <div className="mx-auto max-w-[1500px] px-5 md:px-10 lg:px-14">
        {/* Floating Category Filter Bar */}
        <div className="relative -mt-10 flex gap-1 overflow-x-auto rounded-2xl border border-primary/20 bg-card/80 p-1.5 backdrop-blur-xl [scrollbar-width:none]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`shrink-0 rounded-xl border px-5 py-2.5 font-display text-[11px] tracking-[0.15em] uppercase transition duration-300 lg:flex-1 cursor-pointer ${
                selectedCat === cat
                  ? 'border-primary text-primary shadow-gold'
                  : 'border-transparent text-foreground/70 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Header Count */}
        <div className="mt-10 mb-5 flex items-center justify-between font-display text-xs tracking-[0.25em] uppercase">
          <span className="text-white font-medium">Your products</span>
          <span className="flex items-center text-foreground/70">
            {garageProducts.length} items <ChevronRight className="h-4 w-4 ms-1" />
          </span>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {garageProducts.map((p, idx) => (
            <ProductCard key={p.id} p={p} i={idx} showPrice={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
