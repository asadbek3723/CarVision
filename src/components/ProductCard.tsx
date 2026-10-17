import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Check, Package, AlertCircle } from 'lucide-react';

export interface ProductCompatibility {
  id: string;
  name?: string;
}

export interface ProductSeller {
  id: string;
  business_name: string;
  rating?: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  price: number; // in cents or currency unit
  image_url: string | null;
  stock: number;
  seller?: ProductSeller | null;
  compatibility?: ProductCompatibility[];
  category?: string;
  brand?: string;
}

/** Product image container with graceful fallback */
export function ProductImage({
  src,
  alt,
  className = 'aspect-[4/3]',
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full overflow-hidden rounded-xl bg-[#12141A] border border-white/5 flex items-center justify-center', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#94A3B8]/60">
          <Package className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}

/**
 * Luxury Automotive Product Card:
 * - Direct vehicle fitment badge
 * - Stock status indicator
 * - Price display
 * - Arabic RTL friendly with logical CSS
 */
export interface ProductCardProps {
  product: CatalogProduct;
  vehicleModelId?: string | null | undefined;
  href?: string | undefined;
  onAddToCart?: ((product: CatalogProduct) => void) | undefined;
}

export function ProductCard({
  product,
  vehicleModelId,
  href,
  onAddToCart,
}: ProductCardProps) {
  const fits =
    Boolean(vehicleModelId) &&
    Boolean(product.compatibility?.some((model) => model.id === vehicleModelId));
  const outOfStock = product.stock < 1;

  // Format price: if >= 1000 treat as cents, otherwise unit
  const formattedPrice =
    product.price > 500
      ? `$${(product.price / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `$${product.price.toLocaleString('en-US')}`;

  const CardInner = (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-[#0E1015] p-3.5 transition-all duration-300 hover:border-[#19D3FF]/50 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(25,211,255,0.25)] select-none">
      <ProductImage src={product.image_url} alt={product.name} />

      <div className="mt-3.5 flex flex-1 flex-col">
        {product.brand && (
          <span className="text-[10px] font-bold tracking-wider text-[#19D3FF] uppercase mb-0.5">
            {product.brand}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-[#F5F7FA] group-hover:text-white transition-colors">
          {product.name}
        </h3>

        {/* Fitment and Stock Status Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {fits && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#00E599]/15 border border-[#00E599]/40 px-2 py-0.5 text-[11px] font-medium text-[#00E599]">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Direct Fit</span>
            </span>
          )}
          {outOfStock ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              <AlertCircle className="w-3 h-3" />
              <span>Backorder</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-[#94A3B8]">
              <span>In Stock</span>
            </span>
          )}
        </div>

        {/* Price and Seller Info */}
        <div className="mt-auto pt-4 flex items-baseline justify-between">
          <p className="font-mono text-base font-bold text-white tracking-tight">
            {formattedPrice}
          </p>
          {product.seller && (
            <p className="truncate text-[11px] text-[#94A3B8] max-w-[120px]">
              {product.seller.business_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {CardInner}
      </Link>
    );
  }

  if (onAddToCart) {
    return (
      <div onClick={() => onAddToCart(product)} className="cursor-pointer">
        {CardInner}
      </div>
    );
  }

  return <div>{CardInner}</div>;
}

export interface ProductGridProps {
  products: CatalogProduct[];
  vehicleModelId?: string | null | undefined;
  onProductClick?: ((product: CatalogProduct) => void) | undefined;
}

export function ProductGrid({
  products,
  vehicleModelId,
  onProductClick,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          vehicleModelId={vehicleModelId}
          onAddToCart={onProductClick}
        />
      ))}
    </div>
  );
}
