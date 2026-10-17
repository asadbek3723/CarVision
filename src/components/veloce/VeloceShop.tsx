'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/veloce/ProductCard';
import {
  VELOCE_PRODUCTS,
  VELOCE_CATEGORIES,
  TOP_BRANDS,
} from '@/domain/veloce-catalog';

export function VeloceShop() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const [category, setCategory] = React.useState('All');
  const [query, setQuery] = React.useState('');

  const filteredProducts = React.useMemo(() => {
    return VELOCE_PRODUCTS.filter((p) => {
      const matchesCat = category === 'All' || p.category === category;
      const matchesQuery = (p.name + ' ' + p.brand + ' ' + p.spec)
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [category, query]);

  const categories = ['All', ...VELOCE_CATEGORIES];

  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 md:px-10">
      {/* Search & Filter Header */}
      <div className="rise flex gap-3">
        <label className="flex flex-1 items-center gap-3 rounded-full border border-primary/20 bg-card px-5 py-3.5 transition focus-within:border-primary focus-within:shadow-gold cursor-text">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wheels, exhausts, brands…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-white"
          />
        </label>
        <button
          aria-label="Filters"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/20 transition hover:border-primary cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4 text-foreground/80" />
        </button>
      </div>

      {/* Limited Drop Hero Banner */}
      <section
        className="rise relative mt-6 overflow-hidden rounded-3xl border border-primary/40 bg-card-gradient shadow-gold"
        style={{ animationDelay: '100ms' }}
      >
        <div className="grid items-center md:grid-cols-2">
          <div className="relative z-10 p-7 md:p-12">
            <span className="text-[10px] tracking-luxe text-primary uppercase font-semibold">
              Limited drop
            </span>
            <h1 className="mt-3 font-display text-3xl tracking-[0.12em] md:text-5xl text-white">
              VZ-01 <span className="text-gold-gradient">FORGED</span>
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Monoblock aerospace aluminium. 7.9 kg per wheel. Hand-finished in champagne gold.
            </p>
            <Link
              href={`/${locale}/shop/p1`}
              className="shimmer mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-xs font-bold tracking-[0.2em] text-black uppercase shadow-gold transition hover:brightness-110 active:scale-95"
            >
              Shop now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <img
            src="/assets/wheel-CiWWvvai.jpg"
            alt="VZ-01 wheel"
            className="float-slow absolute -end-16 -bottom-10 h-64 opacity-60 md:relative md:end-0 md:bottom-0 md:h-auto md:opacity-100 object-cover"
          />
        </div>
      </section>

      {/* Category Tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full border px-5 py-2 text-xs tracking-widest uppercase transition cursor-pointer ${
              category === cat
                ? 'border-transparent bg-gold-gradient text-black shadow-gold font-semibold'
                : 'border-primary/20 text-muted-foreground hover:border-primary hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Item Count Header */}
      <div className="mt-8 mb-4 flex justify-between text-sm tracking-[0.2em] uppercase">
        <span className="text-white font-medium">
          {category === 'All' ? 'All parts' : category}
        </span>
        <span className="text-muted-foreground">{filteredProducts.length} items</span>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
        {filteredProducts.map((p, idx) => (
          <ProductCard key={p.id} p={p} i={idx} />
        ))}
      </div>

      {/* Top Brands Grid */}
      <section className="mt-14 mb-8">
        <h2 className="mb-5 text-sm tracking-luxe uppercase text-white font-medium">
          Top brands
        </h2>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {TOP_BRANDS.map((brand) => (
            <div
              key={brand}
              className="grid aspect-square place-items-center rounded-2xl border border-primary/15 bg-card text-center text-[10px] font-semibold tracking-widest uppercase transition hover:-translate-y-1 hover:border-primary hover:text-primary cursor-pointer text-foreground/80"
            >
              {brand}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
