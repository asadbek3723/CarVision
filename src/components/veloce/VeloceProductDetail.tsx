'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Star,
  Check,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import {
  getProductById,
  VELOCE_PRODUCTS,
  formatPriceUSD,
  type VeloceProduct,
} from '@/domain/veloce-catalog';
import { ProductCard } from '@/components/veloce/ProductCard';

interface VeloceProductDetailProps {
  id: string;
}

export function VeloceProductDetail({ id }: VeloceProductDetailProps) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { add } = useVeloceStore();

  const fallbackProduct = VELOCE_PRODUCTS[0] as VeloceProduct;
  const product: VeloceProduct = getProductById(id) || fallbackProduct;
  const [selectedVariant, setSelectedVariant] = React.useState(0);
  const [addedFeedback, setAddedFeedback] = React.useState(false);

  const relatedProducts = React.useMemo(() => {
    return VELOCE_PRODUCTS.filter(
      (p) => p.category === product.category && p.id !== product.id
    ).slice(0, 4);
  }, [product]);

  const handleAddToCart = () => {
    add(product.id);
    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
    }, 1400);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 md:px-10">
      {/* Back to Shop Link */}
      <Link
        href={`/${locale}/shop`}
        className="inline-flex items-center gap-2 text-xs tracking-widest text-muted-foreground uppercase hover:text-primary transition"
      >
        <ChevronLeft className="h-4 w-4" /> Shop
      </Link>

      {/* 2-Column Product Showcase */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Left Column: Product Visual */}
        <div className="rise relative overflow-hidden rounded-3xl border border-primary/20 bg-card-gradient shadow-card">
          {product.swatch ? (
            <div
              className="aspect-square w-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${product.swatch}, oklch(0.08 0 0))`,
              }}
            />
          ) : (
            <img
              src={product.image}
              alt={product.name}
              className="float-slow aspect-square w-full object-cover"
            />
          )}
        </div>

        {/* Right Column: Specifications & Actions */}
        <div className="rise" style={{ animationDelay: '120ms' }}>
          <p className="text-xs tracking-luxe text-primary uppercase font-semibold">
            {product.brand} · {product.category}
          </p>

          <h1 className="mt-3 font-display text-3xl tracking-[0.1em] md:text-5xl text-white">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-white font-medium">{product.rating.toFixed(1)}</span>
            <span>· 128 reviews</span>
          </div>

          <div className="mt-6 text-gold-gradient text-4xl font-bold">
            {formatPriceUSD(product.price)}
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {product.spec}. Engineered for street and track, precision-fitted and backed by
            Veloce's lifetime finish warranty.
          </p>

          {/* Variant Selector */}
          <div className="mt-6">
            <p className="mb-3 text-xs tracking-widest text-muted-foreground uppercase font-medium">
              Variant
            </p>
            <div className="flex gap-2">
              {['Standard', 'Pro', 'Competition'].map((vName, idx) => (
                <button
                  key={vName}
                  onClick={() => setSelectedVariant(idx)}
                  className={`rounded-xl border px-4 py-2.5 text-xs tracking-widest uppercase transition cursor-pointer ${
                    selectedVariant === idx
                      ? 'border-primary text-primary shadow-gold font-semibold'
                      : 'border-primary/20 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {vName}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <p
            className={`mt-6 text-xs font-medium ${
              product.stock > 0 ? 'text-success' : 'text-red-400'
            }`}
          >
            {product.stock > 0
              ? `In stock · ${product.stock} left in warehouse`
              : 'Pre-order · ships in 3 weeks'}
          </p>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="shimmer mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient py-4 text-xs font-bold tracking-[0.25em] text-black uppercase shadow-gold transition active:scale-[0.98] cursor-pointer"
          >
            {addedFeedback ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              'Add to cart'
            )}
          </button>

          {/* Shipping & Warranty Badges */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 p-3 bg-card/60">
              <Truck className="h-4 w-4 text-primary shrink-0" />
              <span>Free express shipping</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 p-3 bg-card/60">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Lifetime warranty</span>
            </div>
          </div>
        </div>
      </div>

      {/* You May Also Like Section */}
      {relatedProducts.length > 0 && (
        <section className="mt-14 mb-12">
          <h2 className="mb-5 text-sm tracking-luxe uppercase text-white font-medium">
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
            {relatedProducts.map((p, idx) => (
              <ProductCard key={p.id} p={p} i={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
