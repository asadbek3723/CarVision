'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useCategoryLabel } from '@/lib/category-label';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  Car,
  Sparkles,
  Lock,
  ShieldCheck,
  Package,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { ProductCard } from '@/components/veloce/ProductCard';
import { buttonClasses, ProductImage } from '@/components/ui';
import { cachedOthers, cachedProduct, rememberProducts } from '@/features/shop/product-cache';
import { previousPath } from '@/lib/nav-history';

interface VeloceProductDetailProps {
  id: string;
  /** The part as the server already loaded it (in the page HTML); no extra request is needed then. */
  initialProduct?: VeloceProduct | null | undefined;
}

export function VeloceProductDetail({ id, initialProduct }: VeloceProductDetailProps) {
  const t = useTranslations('shop.detail');
  const categoryLabel = useCategoryLabel();
  const tCard = useTranslations('shop.card');
  const tNav = useTranslations('nav');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { add, cart, count } = useVeloceStore();
  const reduceMotion = useReducedMotion();
  // Opened from the workshop's garage (?from=garage): the back button returns there, not to the shop.
  const [fromGarage, setFromGarage] = React.useState(false);
  React.useEffect(() => {
    setFromGarage(new URLSearchParams(window.location.search).get('from') === 'garage');
  }, []);
  const cartIconRef = React.useRef<HTMLAnchorElement | null>(null);
  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);
  // The picture that flies from the button to the cart icon after "Add to cart".
  const [flight, setFlight] = React.useState<{ key: number; from: DOMRect; to: DOMRect; src: string | null } | null>(null);
  const [announce, setAnnounce] = React.useState('');
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

  const listHref = fromGarage ? `/${locale}/garage` : `/${locale}/shop`;
  const goBack = () => {
    // Came from the list (or another part) inside the app: real back, which keeps the list's scroll and
    // filters. Opened directly or from anywhere else: go to the list itself.
    const prev = previousPath() ?? '';
    const fromList = fromGarage
      ? prev.startsWith(`/${locale}/garage`) || prev === `/${locale}/seller`
      : prev === `/${locale}/shop` || prev.startsWith(`/${locale}/shop/`);
    if (fromList && window.history.length > 1) router.back();
    else router.push(listHref);
  };

  const topBar = (
    <div className="sticky top-0 z-30 -mx-5 mb-4 flex h-14 items-center justify-between bg-surface-0/90 px-3 backdrop-blur-md md:static md:mx-0 md:mb-8 md:bg-transparent md:px-0 md:backdrop-blur-none">
      <button
        type="button"
        onClick={goBack}
        aria-label={t('back')}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/[0.06] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40 md:w-auto md:gap-2 md:px-3 md:text-xs md:text-white/60"
      >
        <ChevronLeft className="h-6 w-6 rtl:rotate-180 md:h-4 md:w-4" />
        <span className="hidden md:inline">{t('back')}</span>
      </button>
      <Link
        ref={cartIconRef}
        href={`/${locale}/cart`}
        aria-label={tNav('cart')}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40"
      >
        <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.7} />
        {count > 0 && (
          <span
            key={count}
            className="absolute end-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold leading-none tabular-nums text-black ring-2 ring-surface-0 motion-safe:animate-[badge-pop_320ms_ease-out]"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-5 md:px-10 md:pt-10">
        {topBar}
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
      <div className="mx-auto max-w-4xl px-5 text-center md:pt-10">
        {topBar}
        <p className="pt-14 text-sm text-white/50">{t('notFound')}</p>
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

  const inCart = cart[product.id] ?? 0;
  const atMax = product.stock > 0 && inCart >= product.stock;
  const coverSrc = product.swatch ? null : (gallery[Math.min(activeImg, gallery.length - 1)] ?? null);

  const handleAddToCart = () => {
    if (outOfStock || atMax) return;
    add(product.id);
    setAnnounce(t('added'));
    try {
      navigator.vibrate?.(10);
    } catch {
      // not supported
    }
    const from = addButtonRef.current?.getBoundingClientRect();
    const to = cartIconRef.current?.getBoundingClientRect();
    if (!reduceMotion && from && to) setFlight({ key: Date.now(), from, to, src: coverSrc });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-36 md:px-10 md:pt-10">
      {topBar}

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

          {/* Full price (never cut off), the automatic 3% deposit, and stock */}
          <div className="space-y-3">
            <div>
              <p className="break-words font-display text-[28px] font-semibold leading-tight tabular-nums text-white sm:text-4xl">{formatPrice(normalizedUSD)}</p>
              <p className="mt-1 text-xs text-white/50">{t('workshopFullPrice')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2 text-white/75">
                <ShieldCheck className="h-4 w-4 shrink-0 text-gold-500" />
                <span>
                  <span className="font-semibold text-gold-500">3%</span> {t('depositShort', { amount: formatPrice(deposit3PercentUSD) })}
                </span>
              </span>
              <span className={`inline-flex items-center gap-2 ${outOfStock ? 'text-red-300' : 'text-white/75'}`}>
                <Package className={`h-4 w-4 shrink-0 ${outOfStock ? 'text-red-300' : 'text-gold-500'}`} />
                {outOfStock ? t('outOfStock') : t('inStock', { count: product.stock })}
              </span>
            </div>
          </div>

          <Link
            href={`/${locale}/customize?partId=${encodeURIComponent(product.id)}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/[0.1] sm:w-auto"
          >
            <Sparkles className="h-4 w-4 text-gold-500" />
            <span>{t('tryOnCar')}</span>
          </Link>

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

      {/* Fixed bottom bar in place of the dock: one full-width button. Add to cart, then Go to cart. */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-surface-1/95 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md md:start-24 lg:start-28">
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-5 md:px-10">
          {outOfStock ? (
            <button type="button" disabled className={buttonClasses({ size: 'lg', fullWidth: true })}>
              {t('outOfStock')}
            </button>
          ) : inCart === 0 ? (
            <button
              ref={addButtonRef}
              type="button"
              onClick={handleAddToCart}
              className={buttonClasses({ size: 'lg', fullWidth: true, className: 'active:scale-[0.98]' })}
            >
              <ShoppingBag className="h-5 w-5" />
              <span>{t('addToCart')}</span>
            </button>
          ) : (
            <Link href={`/${locale}/cart`} className={buttonClasses({ size: 'lg', fullWidth: true, className: 'motion-safe:animate-[badge-pop_320ms_ease-out]' })}>
              <span>{t('goToCart')}</span>
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </Link>
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      {/* Add-to-cart flight: the part's picture arcs from the button into the cart icon. */}
      <AnimatePresence>
        {flight && (
          <motion.div
            key={flight.key}
            aria-hidden
            className="pointer-events-none fixed z-[60] h-14 w-14 overflow-hidden rounded-2xl bg-surface-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)] ring-2 ring-gold-500/70"
            style={{ top: 0, left: 0 }}
            initial={{
              x: flight.from.left + flight.from.width / 2 - 28,
              y: flight.from.top + flight.from.height / 2 - 28,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: [
                flight.from.left + flight.from.width / 2 - 28,
                (flight.from.left + flight.to.left) / 2,
                flight.to.left + flight.to.width / 2 - 28,
              ],
              y: [
                flight.from.top + flight.from.height / 2 - 28,
                Math.min(flight.from.top, flight.to.top) + 40,
                flight.to.top + flight.to.height / 2 - 28,
              ],
              scale: [1, 0.9, 0.25],
              opacity: [1, 1, 0.4],
            }}
            transition={{ duration: 0.7, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
            onAnimationComplete={() => setFlight(null)}
          >
            {flight.src ? (
              <ProductImage src={flight.src} alt="" sizes="56px" className="object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-gold-500">
                <ShoppingBag className="h-6 w-6" />
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
