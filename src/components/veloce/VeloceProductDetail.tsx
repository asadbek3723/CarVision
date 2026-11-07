'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useCategoryLabel } from '@/lib/category-label';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Car,
  Sparkles,
  MapPin,
  Lock,
  ShieldCheck,
  Package,
  ChevronRight,
} from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { ProductCard } from '@/components/veloce/ProductCard';
import { buttonClasses, ProductImage } from '@/components/ui';
import { cachedOthers, cachedProduct, rememberProducts } from '@/features/shop/product-cache';

interface VeloceProductDetailProps {
  id: string;
  /** The part as the server already loaded it (in the page HTML); no extra request is needed then. */
  initialProduct?: VeloceProduct | null | undefined;
}

export function VeloceProductDetail({ id, initialProduct }: VeloceProductDetailProps) {
  const t = useTranslations('shop.detail');
  const categoryLabel = useCategoryLabel();
  const tCard = useTranslations('shop.card');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { add } = useVeloceStore();
  const { formatPrice } = useCurrency();

  // Shown at once from the server's copy or from the card that was tapped; the network only refreshes it.
  const [product, setProduct] = React.useState<VeloceProduct | null>(() => initialProduct ?? cachedProduct(locale, id));
  const [related, setRelated] = React.useState<VeloceProduct[]>(() => cachedOthers(locale, id, 4));
  const [isLoading, setIsLoading] = React.useState(() => !(initialProduct ?? cachedProduct(locale, id)));
  const [activeImg, setActiveImg] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    const known = initialProduct ?? cachedProduct(locale, id);
    if (known) {
      setProduct(known);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    // The part (only when the server did not send it) and the related parts load side by side.
    const productReq = initialProduct
      ? Promise.resolve()
      : fetch(`/api/v1/products?id=${encodeURIComponent(id)}&locale=${locale}`)
          .then((r) => r.json())
          .then((data) => {
            if (isMounted && data.success && Array.isArray(data.products) && data.products.length > 0) {
              rememberProducts(locale, data.products);
              setProduct(data.products[0]);
            }
          })
          .catch((err) => console.warn('Could not load product detail:', err));
    const relatedReq = fetch(`/api/v1/products?limit=5&locale=${locale}`)
      .then((r) => r.json())
      .then((relData) => {
        if (isMounted && relData.success && Array.isArray(relData.products)) {
          rememberProducts(locale, relData.products);
          setRelated(relData.products.filter((x: VeloceProduct) => x.id !== id).slice(0, 4));
        }
      })
      .catch(() => {});
    productReq.finally(() => {
      if (isMounted) setIsLoading(false);
    });
    void relatedReq;
    return () => {
      isMounted = false;
    };
  }, [id, locale, initialProduct]);

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
        <p className="text-sm text-white/50">{t('notFound')}</p>
        <Link
          href={`/${locale}/shop`}
          className="mt-4 inline-block text-xs tracking-widest text-gold-500 uppercase hover:underline"
        >
          {t('backToShop')}
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
    from && to ? `${from}–${to}` : from ? `${from}+` : to ? t('yearsUpTo', { year: to }) : '';

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
        <span>{t('backToCatalog')}</span>
      </Link>

      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-6">
        {/* Image Visual */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#11131A] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          {product.swatch ? (
            <div
              className="h-full w-full"
              style={{ background: `radial-gradient(circle at 30% 30%, ${product.swatch}, oklch(0.08 0 0))` }}
            />
          ) : gallery.length > 0 ? (
            <ProductImage
              src={gallery[Math.min(activeImg, gallery.length - 1)] as string}
              alt={product.name}
              sizes="(min-width: 1024px) 560px, 100vw"
              priority
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-white/30">{t('noImage')}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute bottom-4 start-4 rounded-full bg-black/75 px-3.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gold-500 backdrop-blur-md">
            {categoryLabel(product.category)}
          </span>
        </div>

        {gallery.length > 1 && !product.swatch && (
          <div className="mt-3 flex gap-2">
            {gallery.map((src, idx) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveImg(idx)}
                aria-label={t('imageN', { n: idx + 1 })}
                className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 ${idx === activeImg ? 'border-gold-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <ProductImage src={src} alt="" sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        </div>

        {/* Clean Boxless Info */}
        <div className="space-y-7 lg:col-span-6">
          <div>
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-gold-500">
              {product.brand}
            </p>
            <h1 className="mt-2 w-full font-heading text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
              {product.name}
            </h1>
            {product.spec && (
              <p className="mt-3 w-full whitespace-pre-line text-sm leading-relaxed text-white/60 sm:text-base">{product.spec}</p>
            )}
          </div>

          {/* Price | stock — no box */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <ShieldCheck className="h-6 w-6 shrink-0 text-gold-500" />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-semibold tabular-nums text-white sm:text-3xl">{formatPrice(normalizedUSD)}</p>
                <p className="truncate text-xs text-white/45">{t('workshopFullPrice')}</p>
              </div>
            </div>
            <span aria-hidden="true" className="h-10 w-px bg-gold-500/40" />
            <div className="flex min-w-0 items-center gap-3">
              <Package className={`h-6 w-6 shrink-0 ${outOfStock ? 'text-red-300' : 'text-gold-500'}`} />
              <div className="min-w-0">
                {outOfStock ? (
                  <p className="truncate text-base font-semibold text-red-300">{t('outOfStock')}</p>
                ) : (
                  <>
                    <p className="truncate font-display text-2xl font-semibold tabular-nums text-white sm:text-3xl">{t('stockCount', { count: product.stock })}</p>
                    <p className="truncate text-xs text-white/45">{t('stockLeft')}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3% deposit — a plain row that starts the unlock */}
          <button
            type="button"
            onClick={handleUnlockAddress}
            disabled={outOfStock}
            className="group flex w-full items-center gap-3 rounded-lg py-1 text-start text-sm text-white/80 transition hover:text-white disabled:opacity-50"
          >
            <ShieldCheck className="h-5 w-5 shrink-0 text-gold-500" />
            <span className="min-w-0 flex-1">
              {t.rich('depositToUnlock', {
                b: (chunks) => <span className="font-semibold text-white">{chunks}</span>,
                amount: formatPrice(deposit3PercentUSD),
              })}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white rtl:rotate-180" />
          </button>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleUnlockAddress}
              disabled={outOfStock}
              className={buttonClasses({ size: 'lg', className: 'flex-1' })}
            >
              <MapPin className="h-4 w-4" />
              <span>{t('unlockCta')}</span>
            </button>

            <Link
              href={`/${locale}/customize?partId=${encodeURIComponent(product.id)}`}
              className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white/[0.05] px-6 py-4 text-xs font-semibold tracking-wider uppercase text-white transition hover:bg-white/[0.1]"
            >
              <Sparkles className="h-4 w-4 text-gold-500" />
              <span>{t('tryOnCar')}</span>
            </Link>
          </div>

          {/* Compatibility, exactly as entered by the workshop */}
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs text-white/50">
              <Car className="h-4 w-4 text-gold-500" />
              {t('compatibleCars')}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.isUniversal ? (
                <span className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-gold-500">{tCard('allCars')}</span>
              ) : (
                (product.compatibility ?? []).map((c) => (
                  <span key={`${c.id}-${c.name}`} className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-gold-500">
                    {c.name}
                    {yearText(c.yearFrom, c.yearTo) ? ` · ${yearText(c.yearFrom, c.yearTo)}` : ''}
                  </span>
                ))
              )}
            </div>
            {specChips.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {specChips.map((c) => (
                  <span key={c} className="rounded-full px-3 py-1 text-[11px] text-white/70">{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Why the workshop stays hidden */}
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            <p className="text-xs leading-relaxed text-white/55">
              <span className="font-semibold text-white">{t('lockedTitle')}</span>{' '}
              {t('lockedBody', { amount: formatPrice(deposit3PercentUSD) })}
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-display text-lg font-light tracking-widest uppercase text-white/80">
            {t('related')}
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
