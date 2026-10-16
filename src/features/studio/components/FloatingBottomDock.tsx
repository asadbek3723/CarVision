'use client';

import * as React from 'react';
import type { StudioPartItem } from '../types';
import type { CategorySlot } from '@/domain/angle-validator';
import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';

export interface FloatingBottomDockProps {
  selectedSlotIds: Set<string>;
  onItemSelect: (item: StudioPartItem) => void;
  isVisible: boolean;
  className?: string;
}

const CATEGORIES: Array<{ slot: CategorySlot; label: string }> = [
  { slot: 'WHEELS_RIMS', label: 'Wheels & Rims' },
  { slot: 'FRONT_BUMPER', label: 'Front Bumpers' },
  { slot: 'REAR_DIFFUSER', label: 'Diffusers' },
  { slot: 'HEADLIGHTS', label: 'Optics' },
  { slot: 'TRUNK_SPOILER', label: 'Spoilers' },
  { slot: 'BODY_COLOR', label: 'Vinyl Wrap' },
  { slot: 'WINDOW_TINT', label: 'Window Tint' },
  { slot: 'POLISH_COAT', label: 'Ceramic 9H' },
];

// Sample catalog items for the dock
const DEMO_ITEMS: StudioPartItem[] = [
  {
    id: 'a1000001-0000-0000-0000-000000000001',
    partName: 'Vossen HF-5 20"',
    category: 'WHEELS_RIMS',
    brand: 'Vossen',
    priceCents: 85000,
    laborCostCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/vossen-hf5.webp',
    inStock: true,
  },
  {
    id: 'a1000001-0000-0000-0000-000000000002',
    partName: 'BBS CI-R 19"',
    category: 'WHEELS_RIMS',
    brand: 'BBS',
    priceCents: 65000,
    laborCostCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/bbs-cir.webp',
    inStock: true,
  },
  {
    id: 'a1000002-0000-0000-0000-000000000001',
    partName: 'Redline Sport Front Bumper',
    category: 'FRONT_BUMPER',
    brand: 'OEM+',
    priceCents: 48000,
    laborCostCents: 12000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    inStock: true,
  },
  {
    id: 'a1000003-0000-0000-0000-000000000001',
    partName: 'Full LED Laser Headlights',
    category: 'HEADLIGHTS',
    brand: 'CustomLED',
    priceCents: 58000,
    laborCostCents: 8000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
    inStock: true,
  },
  {
    id: 'a1000004-0000-0000-0000-000000000001',
    partName: 'Gloss Nardo Gray Wrap',
    category: 'BODY_COLOR',
    brand: 'Inozetek',
    priceCents: 160000,
    laborCostCents: 40000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
  },
];

export function FloatingBottomDock({
  selectedSlotIds,
  onItemSelect,
  isVisible,
  className
}: FloatingBottomDockProps) {
  const [activeCategory, setActiveCategory] = React.useState<CategorySlot>('WHEELS_RIMS');

  const filteredItems = DEMO_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <div
      className={cn(
        'w-full flex flex-col transition-all duration-300 pointer-events-auto',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none',
        className
      )}
    >
      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slot}
            onClick={() => setActiveCategory(cat.slot)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0',
              activeCategory === cat.slot
                ? 'bg-accent-cyan text-[#0A0B0F] shadow-[0_0_15px_rgba(25,211,255,0.4)]'
                : 'glass-panel text-[#94A3B8] hover:text-white hover:bg-white/10'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Horizontal Items Carousel */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 snap-x snap-mandatory no-scrollbar">
        {filteredItems.map((item) => {
          const isSelected = selectedSlotIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => onItemSelect(item)}
              className={cn(
                'relative w-44 h-52 rounded-2xl glass-panel p-3 shrink-0 snap-start cursor-pointer transition-all duration-200 flex flex-col justify-between group hover:border-accent-cyan/60',
                isSelected && 'border-accent-cyan shadow-[0_0_20px_rgba(25,211,255,0.25)]'
              )}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-2 end-2 w-6 h-6 rounded-full bg-accent-cyan text-[#0A0B0F] flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Part Thumbnail */}
              <div className="w-full h-24 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden mb-2">
                <img
                  src={item.imageUrl}
                  alt={item.partName}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Item Info */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-accent-cyan">
                  {item.brand}
                </span>
                <h4 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                  {item.partName}
                </h4>
                <div className="flex items-center justify-between text-xs font-bold text-white font-mono">
                  <span>${(item.priceCents / 100).toFixed(0)}</span>
                  <span className="text-[10px] text-[#94A3B8] font-sans">
                    +${(item.laborCostCents / 100).toFixed(0)} labor
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="w-full py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-cyan" />
            <span>Select items from stock catalog</span>
          </div>
        )}
      </div>
    </div>
  );
}
