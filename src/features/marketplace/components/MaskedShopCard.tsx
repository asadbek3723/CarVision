'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Star, MapPin, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export interface MaskedShopData {
  id: string;
  maskedLabel: string;
  district: string;
  distanceKm: number;
  ratingAvg: number;
  ratingCount: number;
  logoUrl?: string | undefined;
  activeOffersCount: number;
}

export interface MaskedShopCardProps {
  shop: MaskedShopData;
  onBookClick: (shop: MaskedShopData) => void;
}

export function MaskedShopCard({ shop, onBookClick }: MaskedShopCardProps) {
  return (
    <GlassCard className="p-6 flex flex-col justify-between hover:border-[#19D3FF]/60 hover:shadow-glow transition-all group border-white/10 active:scale-[0.99] relative overflow-hidden">
      {/* Top subtle sheen */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#19D3FF]/30 to-transparent group-hover:via-[#19D3FF]/80 transition-all" />

      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-[#0A0B0F] border border-white/10 flex items-center justify-center p-2.5 shrink-0 shadow-inner group-hover:border-[#19D3FF]/40 transition-colors">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.maskedLabel}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ShieldCheck className="w-7 h-7 text-[#19D3FF] drop-shadow-[0_0_8px_rgba(25,211,255,0.6)]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-base group-hover:text-[#19D3FF] transition-colors">
                  {shop.maskedLabel}
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-[#19D3FF] animate-pulse" />
              </div>
              <div className="flex items-center gap-1 text-xs text-[#94A3B8] mt-1 font-mono">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{shop.district} • {shop.distanceKm} km away</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
            <Star className="w-3.5 h-3.5 fill-amber-300" />
            <span>{shop.ratingAvg.toFixed(1)}</span>
            <span className="text-[#94A3B8] text-[10px] font-sans">({shop.ratingCount})</span>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] line-clamp-2 mb-5 leading-relaxed">
          Verified partner facility with {shop.activeOffersCount} verified in-stock tuning and detailing accessories with OEM fitment guarantee.
        </p>
      </div>

      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#19D3FF] font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>3% Escrow Protected</span>
        </div>
        <Button onClick={() => onBookClick(shop)} variant="primary" size="sm" className="h-10 font-bold shadow-glow">
          <span>Book Fitting</span>
          <ArrowRight className="w-3.5 h-3.5 ms-1.5" />
        </Button>
      </div>
    </GlassCard>
  );
}
