'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Car,
  Sparkles,
  MapPin,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { ProductCard } from '@/components/veloce/ProductCard';

interface VeloceProductDetailProps {
  id: string;
}

export function VeloceProductDetail({ id }: VeloceProductDetailProps) {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { add } = useVeloceStore();
  const { formatPrice } = useCurrency();

  const [product, setProduct] = React.useState<VeloceProduct | null>(null);
  const [related, setRelated] = React.useState<VeloceProduct[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeImg, setActiveImg] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/v1/products?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.products) && data.products.length > 0) {
          const found = data.products[0];
          setProduct(found);
          fetch('/api/v1/products?limit=5')
            .then((r2) => r2.json())
            .then((relData) => {
              if (isMounted && relData.success && Array.isArray(relData.products)) {
                setRelated(relData.products.filter((x: VeloceProduct) => x.id !== found.id).slice(0, 4));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => console.warn('Could not load product detail:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-5 pt-10 md:px-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square rounded-3xl bg-white/[0.03] animate-pulse" />
          <div className="space-y-5 py-6">
            <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-10 w-2/3 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-24 w-full rounded bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-5 pt-20 text-center">
        <p className="text-sm text-white/50">Mahsulot topilmadi.</p>
        <Link
          href={`/${locale}/shop`}
          className="mt-4 inline-block text-xs tracking-widest text-[#D4AE62] uppercase hover:underline"
        >
          Do‘konga qaytish
        </Link>
      </div>
    );
  }

  const normalizedUSD = product.price;
  const deposit3PercentUSD = Math.max(1, Math.round(normalizedUSD * 0.03));
  const gallery = product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const attrs = product.attributes ?? {};
  const specChips: string[] = [
    attrs['diameter'] ? `R${attrs['diameter']}` : '',
    attrs['width'] ? `${attrs['width']}J` : '',
    typeof attrs['pcd'] === 'string' ? (attrs['pcd'] as string) : '',
    attrs['offset'] !== undefined ? `ET${attrs['offset']}` : '',
  ].filter(Boolean);
  const outOfStock = (product.stock ?? 0) <= 0;
  const yearText = (from?: number | null, to?: number | null) =>
    from && to ? `${from}–${to}` : from ? `${from}+` : to ? `${to} gacha` : '';

  const handleUnlockAddress = () => {
    add(product.id);
    router.push(`/${locale}/cart/checkout?partId=${encodeURIComponent(product.id)}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pt-6 pb-20 md:px-10 md:pt-10">
      <Link
        href={`/${locale}/shop`}
        className="mb-8 inline-flex items-center gap-2 text-xs text-white/50 transition hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Katalogga qaytish</span>
      </Link>

      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Image Visual */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#11131A] shadow-[0_24px_60px_rgba(0,0,0,0.65)] lg:col-span-6">
          {product.swatch ? (
            <div
              className="h-full w-full"
              style={{ background: `radial-gradient(circle at 30% 30%, ${product.swatch}, oklch(0.08 0 0))` }}
            />
          ) : gallery.length > 0 ? (
            <img src={gallery[Math.min(activeImg, gallery.length - 1)]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-white/30">Rasm yo‘q</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute bottom-4 start-4 rounded-full bg-black/75 px-3.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#D4AE62] backdrop-blur-md">
            {product.category}
          </span>
        </div>

        {gallery.length > 1 && !product.swatch && (
          <div className="-mt-6 flex gap-2 lg:col-span-6 lg:-mt-4">
            {gallery.map((src, idx) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveImg(idx)}
                aria-label={`Rasm ${idx + 1}`}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${idx === activeImg ? 'border-[#D4AE62]' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Clean Boxless Info */}
        <div className="space-y-6 lg:col-span-6">
          <div>
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-[#D4AE62]">
              {product.brand}
            </p>
            <h1 className="mt-2 font-display text-2xl font-light text-white sm:text-4xl">
              {product.name}
            </h1>
          </div>

          {/* Compatibility, exactly as entered by the workshop */}
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs text-white/50">
              <Car className="h-4 w-4 text-[#D4AE62]" />
              Mos avtomobillar
            </p>
            <div className="flex flex-wrap gap-2">
              {product.isUniversal ? (
                <span className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-[#D4AE62]">Barcha mashinalar</span>
              ) : (
                (product.compatibility ?? []).map((c) => (
                  <span key={`${c.id}-${c.name}`} className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-[#D4AE62]">
                    {c.name}
                    {yearText(c.yearFrom, c.yearTo) ? ` · ${yearText(c.yearFrom, c.yearTo)}` : ''}
                  </span>
                ))
              )}
            </div>
            {specChips.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {specChips.map((c) => (
                  <span key={c} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70">{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Price & 3% Lead Unlock Info */}
          <div className="pt-2">
            <p className="text-xs text-white/45">Ustaxonadagi to‘liq narxi</p>
            <div className="mt-1 font-display text-3xl font-semibold text-white tabular-nums sm:text-4xl">
              {formatPrice(normalizedUSD)}
            </div>
            <p className="mt-2 text-sm text-emerald-400">
              Manzilni ochish uchun 3% zakalat: <span className="font-mono font-bold">{formatPrice(deposit3PercentUSD)}</span>
            </p>
          </div>

          {product.spec && <p className="whitespace-pre-line text-sm leading-relaxed text-white/65">{product.spec}</p>}
          <p className={`text-xs font-semibold ${outOfStock ? 'text-red-300' : 'text-emerald-400'}`}>
            {outOfStock ? 'Hozircha omborda yo‘q' : `Omborda mavjud: ${product.stock} ta`}
          </p>

          {/* Locked Workshop Explanation (Boxless soft surface) */}
          <div className="rounded-2xl bg-white/[0.03] p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AE62]/15 text-[#D4AE62]">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Qaysi tuning servisda borligi 3% to‘lovdan so‘ng ochiladi
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Biz mahsulotni sotmaymiz. Agar ushbu detal sizga ma’qul kelsa, 3% ({formatPrice(deposit3PercentUSD)}) to‘lov qilasiz — biz darhol sizga o‘sha tuning servisning aniq manzilini beramiz va ustaxonaga sizning raqamingizni yuboramiz.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={handleUnlockAddress}
              disabled={outOfStock}
              className="shimmer flex flex-1 items-center justify-center gap-2.5 rounded-2xl disabled:cursor-not-allowed disabled:opacity-40 bg-gold-gradient px-6 py-4 text-xs font-bold tracking-wider uppercase text-black shadow-[0_12px_30px_rgba(212,174,98,0.25)] transition hover:brightness-110 cursor-pointer"
            >
              <MapPin className="h-4 w-4" />
              <span>3% To‘lab Manzilni Olish ({formatPrice(deposit3PercentUSD)})</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <Link
              href={`/${locale}/customize?partId=${encodeURIComponent(product.id)}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-6 py-4 text-xs font-semibold tracking-wider uppercase text-white transition hover:bg-white/[0.1]"
            >
              <Sparkles className="h-4 w-4 text-[#D4AE62]" />
              <span>Mashinamda Sinab Ko‘rish</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-display text-lg font-light tracking-widest uppercase text-white/80">
            O‘xshash Detallar
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p, idx) => (
              <ProductCard key={p.id} p={p} i={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
