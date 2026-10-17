'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Star, Plus } from 'lucide-react';
import { VeloceProduct, formatPriceUSD } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';

interface ProductCardProps {
  p: VeloceProduct;
  i?: number;
  showPrice?: boolean;
}

export function ProductCard({ p, i = 0, showPrice = true }: ProductCardProps) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { add } = useVeloceStore();

  return (
    <div
      className="rise group relative overflow-hidden rounded-2xl border bg-card-gradient shadow-card transition duration-500 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-gold"
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <Link href={`/${locale}/shop/${p.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {p.swatch ? (
            <div
              className="h-full w-full transition duration-700 group-hover:scale-110"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${p.swatch}, oklch(0.08 0 0))`,
              }}
            />
          ) : (
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent" />
          <span className="absolute bottom-3 start-3 rounded-full border border-primary/60 bg-background/70 px-3 py-1 text-[10px] font-semibold tracking-widest text-primary uppercase backdrop-blur">
            {p.category}
          </span>
        </div>

        <div className="space-y-1 p-4">
          <div className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            {p.brand}
          </div>
          <h3 className="truncate font-semibold text-white">{p.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{p.spec}</p>
        </div>
      </Link>

      {showPrice && (
        <div className="flex items-center justify-between px-4 pb-4">
          <div>
            <div className="text-gold-gradient font-bold">{formatPriceUSD(p.price)}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span>{p.rating.toFixed(1)}</span>
            </div>
          </div>
          <button
            onClick={() => add(p.id)}
            aria-label={`Add ${p.name}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-gold-gradient text-primary-foreground transition active:scale-90 hover:shadow-gold cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
