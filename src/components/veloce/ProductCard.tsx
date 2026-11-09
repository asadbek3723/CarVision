'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useCategoryLabel } from '@/lib/category-label';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Car } from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useCurrency } from '@/context/CurrencyContext';
import { rememberProducts, warmImage } from '@/features/shop/product-cache';
import { ProductImage } from '@/components/ui/ProductImage';

interface ProductCardProps {
  p: VeloceProduct;
  i?: number;
  showPrice?: boolean;
}

export function ProductCard({ p, i = 0, showPrice = true }: ProductCardProps) {
  const t = useTranslations('shop.card');
  const categoryLabel = useCategoryLabel();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();

  const [imgFailed, setImgFailed] = React.useState(false);

  // Only what the seller entered: never a guessed car.
  const carLabel = React.useMemo(() => {
    if (p.isUniversal) return t('allCars');
    const names = (p.compatibility ?? []).map((c) => c.name).filter(Boolean);
    if (names.length === 0) return p.targetCar || '';
    return names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] as string);
  }, [p, t]);

  return (
    <Link
      href={`/${locale}/shop/${p.id}`}
      aria-label={p.name}
      // The part's page opens from memory, and its big photo starts downloading on first touch.
      onPointerDown={() => {
        rememberProducts(locale, [p]);
        warmImage(p.images?.[0] ?? p.image);
      }}
      className="rise group relative flex flex-col overflow-hidden rounded-2xl bg-surface-1 outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 transition duration-500 md:shadow-[0_12px_32px_rgba(0,0,0,0.6)] md:hover:-translate-y-1.5 md:hover:shadow-[0_20px_45px_rgba(232,191,116,0.18)]"
      style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
    >
      <div className="block">
        <div className="relative aspect-square overflow-hidden md:aspect-[4/3]">
          {p.swatch ? (
            <div
              className="h-full w-full transition duration-700 md:group-hover:scale-110"
              style={{ background: `radial-gradient(circle at 30% 30%, ${p.swatch}, oklch(0.08 0 0))` }}
            />
          ) : imgFailed || !p.image ? (
            <div className="h-full w-full bg-surface-2" />
          ) : (
            <ProductImage
              src={p.image}
              alt={p.name}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
              onError={() => setImgFailed(true)}
              className="object-cover transition duration-700 md:group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent md:from-card" />
          <span className="absolute bottom-3 start-3 hidden rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary backdrop-blur md:inline-block">
            {categoryLabel(p.category)}
          </span>
        </div>

        <div className="p-3 md:space-y-1.5 md:p-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:tracking-[0.2em]">{p.brand}</span>
            {carLabel && (
              <span className="hidden items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gold-500 md:inline-flex">
                <Car className="h-3 w-3" />
                <span className="max-w-[110px] truncate">{carLabel}</span>
              </span>
            )}
          </div>
          {/* Phones: two lines of name, no spec; desktop: one line each */}
          <h3 className="mt-1 line-clamp-2 min-h-[2.6em] text-[14px] font-semibold leading-[1.3] text-white md:mt-0 md:line-clamp-1 md:min-h-0 md:text-base">{p.name}</h3>
          <p className="hidden truncate text-xs text-muted-foreground md:block">{p.spec}</p>
        </div>
      </div>

      {showPrice && (
        <div className="mt-auto flex items-center justify-between gap-2 px-3 pb-3 md:px-4 md:pb-4">
          <div className="min-w-0">
            <div className="truncate whitespace-nowrap font-display text-[15px] font-bold tabular-nums tracking-tight text-gold-gradient md:text-base">
              {formatPrice(p.price)}
            </div>
            <div className="hidden text-[10px] text-white/40 md:block">{t('depositHint')}</div>
          </div>
        </div>
      )}
    </Link>
  );
}
