'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { VeloceProduct } from '@/domain/veloce-catalog';
import { useCurrency } from '@/context/CurrencyContext';
import { rememberProducts, warmImage } from '@/features/shop/product-cache';
import { ProductImage } from '@/components/ui/ProductImage';
import { md, mdFocus } from '@/features/minimal/theme';

/**
 * Figma "Minimal/Product card": square photo (radius 18), brand label, two-line name,
 * price and a round yellow arrow. The workshop stays hidden until the purchase, so the
 * label slot shows the part's brand.
 */
export function MinimalProductCard({ p, i = 0, isNew = false }: { p: VeloceProduct; i?: number; isNew?: boolean }) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <Link
      href={`/${locale}/shop/${p.id}`}
      aria-label={p.name}
      // Fully prefetched while the card is on screen: tapping it opens the part with no waiting.
      prefetch
      onPointerDown={() => {
        rememberProducts(locale, [p]);
        warmImage(p.images?.[0] ?? p.image);
      }}
      className={`${isNew ? 'cv-new' : 'rise'} group flex min-w-0 flex-col rounded-[18px] ${mdFocus}`}
      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
    >
      <div className={`relative aspect-square overflow-hidden rounded-[18px] ${md.card}`}>
        {p.swatch ? (
          <div className="h-full w-full" style={{ background: `radial-gradient(circle at 30% 30%, ${p.swatch}, #0A0A0A)` }} />
        ) : imgFailed || !p.image ? (
          <div className={`h-full w-full ${md.card}`} />
        ) : (
          <ProductImage
            src={p.image}
            alt=""
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            onError={() => setImgFailed(true)}
            className="object-cover transition duration-500 md:group-hover:scale-105"
          />
        )}
      </div>

      <span className={`mt-3 truncate text-[10px] font-medium uppercase leading-none tracking-[0.06em] ${md.faint}`}>{p.brand}</span>
      <h3 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[14px] font-medium leading-[1.3] text-white">{p.name}</h3>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[15px] font-semibold leading-none tabular-nums text-white">{formatPrice(p.price)}</span>
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${md.accentBg} text-[#0A0A0A] transition group-hover:scale-105`}>
          <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.4} />
        </span>
      </div>
    </Link>
  );
}
