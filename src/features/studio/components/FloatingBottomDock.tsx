'use client';

import * as React from 'react';
import type { StudioPartItem } from '../types';
import type { CategorySlot } from '@/domain/angle-validator';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Disc, Shield, Palette, Eye, Sun, Wrench, X } from 'lucide-react';

export interface FloatingBottomDockProps {
  selectedSlotIds: Set<string>;
  onItemSelect: (item: StudioPartItem) => void;
  onItemRemove?: (slot: CategorySlot) => void;
  isVisible: boolean;
  className?: string;
}

const CATEGORIES: Array<{ slot: CategorySlot; label: string; icon: React.ElementType }> = [
  { slot: 'WHEELS_RIMS', label: 'Wheels & Rims', icon: Disc },
  { slot: 'FRONT_BUMPER', label: 'Front Bumpers', icon: Shield },
  { slot: 'REAR_DIFFUSER', label: 'Diffusers', icon: Shield },
  { slot: 'HEADLIGHTS', label: 'Optics & LED', icon: Eye },
  { slot: 'TRUNK_SPOILER', label: 'Aero Spoilers', icon: Wrench },
  { slot: 'BODY_COLOR', label: 'Vinyl Wrap', icon: Palette },
  { slot: 'WINDOW_TINT', label: 'Window Tint', icon: Sun },
  { slot: 'POLISH_COAT', label: 'Ceramic 9H', icon: Sparkles },
];

const DEMO_ITEMS: StudioPartItem[] = [
  {
    id: 'a1000001-0000-0000-0000-000000000001',
    partName: 'Vossen HF-5 20" Forged',
    category: 'WHEELS_RIMS',
    brand: 'Vossen',
    priceCents: 85000,
    laborCostCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/vossen-hf5.webp',
    inStock: true,
  },
  {
    id: 'a1000001-0000-0000-0000-000000000002',
    partName: 'BBS CI-R 19" Satin Titanium',
    category: 'WHEELS_RIMS',
    brand: 'BBS',
    priceCents: 65000,
    laborCostCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/bbs-cir.webp',
    inStock: true,
  },
  {
    id: 'a1000001-0000-0000-0000-000000000003',
    partName: 'Rotiform LAS-R 20" Custom Black',
    category: 'WHEELS_RIMS',
    brand: 'Rotiform',
    priceCents: 72000,
    laborCostCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/vossen-hf5.webp',
    inStock: true,
  },
  {
    id: 'a1000002-0000-0000-0000-000000000001',
    partName: 'Redline Sport Carbon Front Bumper',
    category: 'FRONT_BUMPER',
    brand: 'OEM+ Performance',
    priceCents: 48000,
    laborCostCents: 12000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    inStock: true,
  },
  {
    id: 'a1000002-0000-0000-0000-000000000002',
    partName: 'Aggressive Hex Mesh Grille & Lip',
    category: 'FRONT_BUMPER',
    brand: 'Vorsteiner',
    priceCents: 52000,
    laborCostCents: 14000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    inStock: true,
  },
  {
    id: 'a1000003-0000-0000-0000-000000000001',
    partName: 'Full Matrix LED Laser Headlights',
    category: 'HEADLIGHTS',
    brand: 'CustomLED Pro',
    priceCents: 58000,
    laborCostCents: 8000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
    inStock: true,
  },
  {
    id: 'a1000004-0000-0000-0000-000000000001',
    partName: 'Supergloss Nardo Gray Vinyl',
    category: 'BODY_COLOR',
    brand: 'Inozetek',
    priceCents: 160000,
    laborCostCents: 40000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
    swatchHex: '#7B8084',
  },
  {
    id: 'a1000004-0000-0000-0000-000000000002',
    partName: 'Satin Obsidian Black Wrap',
    category: 'BODY_COLOR',
    brand: '3M 2080',
    priceCents: 175000,
    laborCostCents: 45000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
    swatchHex: '#181A1F',
  },
  {
    id: 'a1000004-0000-0000-0000-000000000003',
    partName: 'Frozen Miami Cyan Blue',
    category: 'BODY_COLOR',
    brand: 'Avery Dennison',
    priceCents: 168000,
    laborCostCents: 42000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
    swatchHex: '#19D3FF',
  },
  {
    id: 'a1000004-0000-0000-0000-000000000004',
    partName: 'British Racing Green Satin',
    category: 'BODY_COLOR',
    brand: 'KPMF',
    priceCents: 172000,
    laborCostCents: 45000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
    swatchHex: '#16422E',
  },
  {
    id: 'a1000005-0000-0000-0000-000000000001',
    partName: 'Carbon Fiber Ducktail Spoiler',
    category: 'TRUNK_SPOILER',
    brand: 'AeroCraft',
    priceCents: 35000,
    laborCostCents: 6000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
    inStock: true,
  },
  {
    id: 'a1000006-0000-0000-0000-000000000001',
    partName: 'Dual Quad-Fin Carbon Diffuser',
    category: 'REAR_DIFFUSER',
    brand: 'Akrapovic Style',
    priceCents: 49000,
    laborCostCents: 11000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    inStock: true,
  },
  {
    id: 'a1000007-0000-0000-0000-000000000001',
    partName: 'Ceramic Pro 9H Coating',
    category: 'POLISH_COAT',
    brand: 'Ceramic Pro',
    priceCents: 60000,
    laborCostCents: 20000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
  },
  {
    id: 'a1000008-0000-0000-0000-000000000001',
    partName: 'Nano-Ceramic IR 15% Tint',
    category: 'WINDOW_TINT',
    brand: 'SunTek Ultra',
    priceCents: 28000,
    laborCostCents: 7000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    inStock: true,
  },
];

export function FloatingBottomDock({
  selectedSlotIds,
  onItemSelect,
  onItemRemove,
  isVisible,
  className,
}: FloatingBottomDockProps) {
  const [activeCategory, setActiveCategory] = React.useState<CategorySlot>('WHEELS_RIMS');

  const filteredItems = DEMO_ITEMS.filter((item) => item.category === activeCategory);
  const activeSelected = filteredItems.find((item) => selectedSlotIds.has(item.id));

  const handleSelect = (item: StudioPartItem) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    onItemSelect(item);
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {
        // ignore
      }
    }
    onItemRemove?.(activeCategory);
  };

  return (
    <div
      className={cn(
        'w-full flex flex-col transition-all duration-300 pointer-events-auto',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none',
        className
      )}
    >
      {/* 1. Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar max-w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.slot;
          const hasSelectedInCat = DEMO_ITEMS.some(
            (item) => item.category === cat.slot && selectedSlotIds.has(item.id)
          );

          return (
            <button
              key={cat.slot}
              onClick={() => {
                if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
                  try {
                    navigator.vibrate(6);
                  } catch {
                    // ignore
                  }
                }
                setActiveCategory(cat.slot);
              }}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-2 cursor-pointer active:scale-95',
                isActive
                  ? 'bg-[#19D3FF] text-[#0A0B0F] font-bold shadow-[0_0_18px_rgba(25,211,255,0.45)]'
                  : 'glass-panel text-[#94A3B8] hover:text-[#F5F7FA] hover:bg-white/10 border-white/10'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#0A0B0F]' : 'text-[#19D3FF]')} />
              <span>{cat.label}</span>
              {hasSelectedInCat && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isActive ? 'bg-[#0A0B0F]' : 'bg-[#19D3FF]'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Horizontal Options Carousel (Hick's Law) */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 snap-x snap-mandatory no-scrollbar">
        {/* Reset / Stock OEM Option Card */}
        <div
          onClick={handleReset}
          className={cn(
            'relative w-28 h-52 rounded-2xl glass-panel-dense p-3 shrink-0 snap-start cursor-pointer transition-all duration-200 flex flex-col justify-between group active:scale-[0.97] border-white/10 hover:border-white/30',
            !activeSelected && 'border-white/40 bg-white/5 ring-1 ring-white/20'
          )}
        >
          <div className="w-full h-24 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
            <X className="w-6 h-6 text-[#94A3B8] group-hover:text-white transition-colors" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Stock</span>
            <h4 className="text-xs font-semibold text-[#F5F7FA] line-clamp-1">Original OEM</h4>
            <span className="text-[11px] text-[#94A3B8] font-mono">$0</span>
          </div>
          {!activeSelected && (
            <div className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* Catalog Items */}
        {filteredItems.map((item) => {
          const isSelected = selectedSlotIds.has(item.id);
          const isColorSwatch = Boolean(item.swatchHex);

          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className={cn(
                'relative w-44 h-52 rounded-2xl glass-panel-dense p-3 shrink-0 snap-start cursor-pointer transition-all duration-200 flex flex-col justify-between group active:scale-[0.97] border-white/10 hover:border-[#19D3FF]/60 hover:shadow-glow',
                isSelected && 'border-[#19D3FF] bg-[#12141A]/95 shadow-[0_0_25px_rgba(25,211,255,0.3)] ring-1 ring-[#19D3FF]'
              )}
            >
              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div className="absolute top-2.5 end-2.5 w-6 h-6 rounded-full bg-[#19D3FF] text-[#0A0B0F] flex items-center justify-center shadow-[0_0_10px_rgba(25,211,255,0.7)] z-10">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Swatch or Thumbnail Container */}
              {isColorSwatch ? (
                <div
                  className="w-full h-24 rounded-xl flex items-center justify-center overflow-hidden mb-2 relative shadow-inner border border-white/10"
                  style={{ backgroundColor: item.swatchHex }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/30 pointer-events-none" />
                </div>
              ) : (
                <div className="w-full h-24 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden mb-2 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.partName}
                    className="w-full h-full object-contain p-2 group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
              )}

              {/* Item Info */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#19D3FF]">
                  {item.brand}
                </span>
                <h4 className="text-xs font-semibold text-[#F5F7FA] line-clamp-1 mb-1 group-hover:text-white">
                  {item.partName}
                </h4>
                <div className="flex items-center justify-between text-xs font-bold text-white font-mono tabular-nums">
                  <span className="text-white">${(item.priceCents / 100).toFixed(0)}</span>
                  <span className="text-[10px] text-[#94A3B8] font-sans">
                    +${(item.laborCostCents / 100).toFixed(0)} fit
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="w-full py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#19D3FF]" />
            <span>Select items from stock catalog</span>
          </div>
        )}
      </div>
    </div>
  );
}
