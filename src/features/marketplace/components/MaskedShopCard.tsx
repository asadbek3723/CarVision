'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Star, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';

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
    <GlassCard className="p-5 flex flex-col justify-between hover:border-accent-cyan/60 transition-all group">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0A0B0F] border border-[#232733] flex items-center justify-center p-2 shrink-0">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.maskedLabel}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ShieldCheck className="w-6 h-6 text-accent-cyan" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-base">{shop.maskedLabel}</h3>
                <ShieldCheck className="w-4 h-4 text-accent-cyan shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-xs text-[#94A3B8] mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{shop.district} • {shop.distanceKm} km away</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
            <Star className="w-3 h-3 fill-amber-300" />
            <span>{shop.ratingAvg.toFixed(1)}</span>
            <span className="text-[#94A3B8] text-[10px] font-sans">({shop.ratingCount})</span>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] line-clamp-2 mb-4">
          Verified partner with {shop.activeOffersCount} verified in-stock tuning and detailing accessories.
        </p>
      </div>

      <div className="pt-3 border-t border-[#232733] flex items-center justify-between">
        <span className="text-xs text-accent-cyan font-semibold">3% Escrow Protected</span>
        <Button onClick={() => onBookClick(shop)} variant="primary" size="sm" className="h-9">
          <span>Book Fitting</span>
          <ArrowRight className="w-3.5 h-3.5 ms-1.5" />
        </Button>
      </div>
    </GlassCard>
  );
}
