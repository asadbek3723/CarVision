'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Check,
  Plus,
} from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import {
  VELOCE_PRODUCTS,
  formatPriceUSD,
  VeloceProduct,
} from '@/domain/veloce-catalog';

const CATEGORIES = [
  'Wheels',
  'Body Kit',
  'Suspension',
  'Color',
  'Interior',
  'Performance',
];

export function VeloceCustomize() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { photo, add, openCamera } = useVeloceStore();

  const [activeCategory, setActiveCategory] = React.useState('Wheels');
  const [selectedParts, setSelectedParts] = React.useState<Record<string, string>>({});
  const [appliedFeedback, setAppliedFeedback] = React.useState(false);

  // Products for the current category
  const categoryProducts = React.useMemo(() => {
    return VELOCE_PRODUCTS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  // Selected item in current category
  const activeProductId = selectedParts[activeCategory] || categoryProducts[0]?.id;
  const fallbackProduct = VELOCE_PRODUCTS[0] as VeloceProduct;
  const activeItem: VeloceProduct =
    categoryProducts.find((p) => p.id === activeProductId) ||
    categoryProducts[0] ||
    fallbackProduct;
  const activeIndex = Math.max(0, categoryProducts.indexOf(activeItem));

  // Cycle carousel tape
  const selectIndex = (idx: number) => {
    const len = categoryProducts.length;
    if (len === 0) return;
    const normalized = (idx + len) % len;
    const targetProduct = categoryProducts[normalized];
    if (targetProduct) {
      setSelectedParts((prev) => ({
        ...prev,
        [activeCategory]: targetProduct.id,
      }));
    }
  };

  const selectedCount = Object.values(selectedParts).length;

  const handleApply = () => {
    if (activeItem) {
      setSelectedParts((prev) => ({
        ...prev,
        [activeCategory]: activeItem.id,
      }));
    }
    setAppliedFeedback(true);
    setTimeout(() => {
      setAppliedFeedback(false);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-5 pt-4 md:px-10">
      {/* Top Header Row */}
      <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center">
        <Link
          href={`/${locale}/seller`}
          aria-label="Back"
          className="text-muted-foreground hover:text-primary transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-center font-display text-sm font-light tracking-[0.5em] uppercase text-white">
          Customize
        </h1>
        <button
          onClick={openCamera}
          aria-label="Retake"
          className="grid h-9 w-9 place-items-center rounded-full border border-primary/20 hover:border-primary transition cursor-pointer"
        >
          <Camera className="h-4 w-4 text-foreground/80" />
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
        {/* Left Column: Car Viewport (Sticky on desktop) */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-card bg-card">
            <div className="flash pointer-events-none absolute inset-0 z-10 bg-white" />
            <img
              src={photo || '/assets/car-CjioCIbt.jpg'}
              alt="Your car"
              className="aspect-[16/10] w-full object-cover"
            />
            {activeItem?.swatch && (
              <div
                className="absolute inset-0 mix-blend-color transition-colors duration-700 pointer-events-none"
                style={{ background: activeItem.swatch, opacity: 0.45 }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-4">
              <p className="text-[10px] tracking-luxe text-primary uppercase">
                {photo ? 'Yuklangan avtomobil' : 'Tanlangan avtomobil'}
              </p>
              <p className="text-sm text-foreground/90 font-medium">
                {selectedCount} parts selected
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Customizer Controls */}
        <div>
          {/* Category Tabs */}
          <div className="flex gap-5 overflow-x-auto border-b border-primary/15 [scrollbar-width:none]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative shrink-0 pb-3 text-xs tracking-[0.2em] uppercase transition cursor-pointer ${
                  activeCategory === cat ? 'text-white font-medium' : 'text-muted-foreground'
                }`}
              >
                {cat}
                <span
                  className={`absolute inset-x-0 -bottom-px h-0.5 bg-gold-gradient transition-transform duration-300 ${
                    activeCategory === cat ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Carousel Tape */}
          <div key={activeCategory} className="rise mt-6 flex items-center gap-2">
            <button
              onClick={() => selectIndex(activeIndex - 1)}
              aria-label="Previous"
              className="shrink-0 text-muted-foreground hover:text-primary transition cursor-pointer p-1"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-3">
              {[-1, 0, 1].map((offset) => {
                const len = categoryProducts.length;
                if (len === 0) return null;
                const idx = (activeIndex + offset + len) % len;
                const item = categoryProducts[idx];
                if (!item) return null;

                const isCurrent = offset === 0;

                return (
                  <button
                    key={`${item.id}-${offset}`}
                    onClick={() => selectIndex(activeIndex + offset)}
                    className={`overflow-hidden rounded-2xl border bg-card transition-all duration-500 cursor-pointer ${
                      isCurrent
                        ? 'h-32 w-32 border-primary shadow-gold ring-4 ring-primary/10 md:h-44 md:w-44'
                        : 'h-20 w-20 opacity-40 grayscale hover:opacity-80 md:h-28 md:w-28'
                    }`}
                  >
                    {item.swatch ? (
                      <div className="h-full w-full" style={{ background: item.swatch }} />
                    ) : (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => selectIndex(activeIndex + 1)}
              aria-label="Next"
              className="shrink-0 text-muted-foreground hover:text-primary transition cursor-pointer p-1"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Active Item Details */}
          {activeItem && (
            <div className="mt-4 text-center">
              <h2 className="font-display text-xl font-normal tracking-[0.2em] text-white">
                {activeItem.name}
              </h2>
              <p className="text-xs text-muted-foreground">{activeItem.spec}</p>
              <p className="mt-1 text-gold-gradient font-bold text-lg">
                {formatPriceUSD(activeItem.price)}
              </p>
            </div>
          )}

          {/* Warehouse Inventory List */}
          <div className="mt-8 mb-3 flex justify-between text-xs tracking-[0.2em] uppercase">
            <span className="text-white">In warehouse</span>
            <span className="text-muted-foreground">{categoryProducts.length} items</span>
          </div>

          <div className="space-y-2">
            {categoryProducts.map((prod, idx) => {
              const isSelected = prod.id === activeItem?.id;
              return (
                <div
                  key={prod.id}
                  onClick={() => selectIndex(idx)}
                  className={`rise flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 transition ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-gold'
                      : 'border-primary/15 bg-card hover:border-primary/50'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {prod.swatch ? (
                    <div
                      className="h-14 w-14 shrink-0 rounded-xl"
                      style={{ background: prod.swatch }}
                    />
                  ) : (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{prod.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {prod.brand} ·{' '}
                      {prod.stock > 0 ? `${prod.stock} in stock` : 'Pre-order'}
                    </p>
                  </div>

                  <span className="text-sm font-bold text-primary">
                    {formatPriceUSD(prod.price)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      add(prod.id);
                    }}
                    aria-label="Add to cart"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/20 hover:bg-gold-gradient hover:text-black transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sticky Apply Button */}
          <button
            onClick={handleApply}
            className="shimmer sticky bottom-24 mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient py-4 text-xs font-bold tracking-[0.25em] text-black uppercase shadow-gold transition active:scale-[0.98] md:bottom-6 cursor-pointer"
          >
            {appliedFeedback ? (
              <>
                <Check className="h-4 w-4" />
                <span>Applied</span>
              </>
            ) : (
              'Apply changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
