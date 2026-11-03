'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Car, Plus } from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';

interface ProductCardProps {
  p: VeloceProduct;
  i?: number;
  showPrice?: boolean;
}

export function ProductCard({ p, i = 0, showPrice = true }: ProductCardProps) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { add } = useVeloceStore();
  const { formatPrice } = useCurrency();

  const [imgFailed, setImgFailed] = React.useState(false);

  // Only what the seller entered: never a guessed car.
  const carLabel = React.useMemo(() => {
    if (p.isUniversal) return 'Barcha mashinalar';
    const names = (p.compatibility ?? []).map((c) => c.name).filter(Boolean);
    if (names.length === 0) return p.targetCar || '';
    return names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] as string);
  }, [p]);

  return (
    <div
      className="rise group relative overflow-hidden rounded-2xl bg-[#12141A] shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(212,174,98,0.18)]"
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
            imgFailed || !p.image ? (
              <div className="flex h-full w-full items-center justify-center bg-[#0E1016] text-[10px] uppercase tracking-widest text-white/30">Rasm yo‘q</div>
            ) : (
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />
            )
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent" />
          <span className="absolute bottom-3 start-3 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold tracking-widest text-primary uppercase backdrop-blur">
            {p.category}
          </span>
        </div>

        <div className="space-y-1.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase truncate">
              {p.brand}
            </span>
            {carLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#D4AE62]">
                <Car className="h-3 w-3" />
                <span className="max-w-[110px] truncate">{carLabel}</span>
              </span>
            )}
          </div>
          <h3 className="truncate font-semibold text-white">{p.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{p.spec}</p>
        </div>
      </Link>

      {showPrice && (
        <div className="flex items-center justify-between px-4 pb-4">
          <div>
            <div className="text-gold-gradient font-bold tabular-nums tracking-tight font-display text-sm sm:text-base">
              {formatPrice(p.price)}
            </div>
            <div className="text-[10px] text-white/40">
              3% to‘lovda ustaxona manzili ochiladi
            </div>
          </div>
          <button
            onClick={() => add(p.id)}
            disabled={p.stock === 0}
            aria-label={`Savatga qo‘shish: ${p.name}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-gold-gradient text-primary-foreground transition active:scale-90 hover:shadow-gold cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
