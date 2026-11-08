'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Minus, Plus, ShoppingBag, Trash2, Car, ArrowRight } from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { Modal, ProductImage, buttonClasses } from '@/components/ui';
import { rememberProducts } from '@/features/shop/product-cache';
import { cn } from '@/lib/utils';

/** Parts left at or below this count show an "N left" warning, as marketplaces do. */
const LOW_STOCK = 5;
const depositOf = (usd: number) => Math.max(1, Math.round(usd * 0.03));

/** Square tick box; the cart's only selection control. */
function Tick({ checked, disabled, onChange, label, className }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg border-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'border-gold-500 bg-gold-500 text-black' : 'border-white/25 bg-black/30 text-transparent hover:border-white/45',
        className
      )}
    >
      <Check className="h-4 w-4" strokeWidth={3} />
    </button>
  );
}

/**
 * The cart, laid out like a marketplace cart: tick lines, change quantities, and pay the 3% deposit
 * for the ticked ones. The deposit unlocks the workshop address; the rest is paid at the workshop.
 */
export function VeloceCart() {
  const params = useParams();
  const t = useTranslations('shop.cart');
  const tCard = useTranslations('shop.card');
  const locale = (params?.['locale'] as string) || 'uz';
  const { cart, add, remove, removeLines, cartUnselected, setCartSelected, setAllCartSelected } = useVeloceStore();
  const { formatPrice } = useCurrency();

  const [productsMap, setProductsMap] = React.useState<Record<string, VeloceProduct>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const cartIdsKey = Object.keys(cart).sort().join(',');

  React.useEffect(() => {
    if (!cartIdsKey) {
      setLoaded(true);
      return;
    }
    let isMounted = true;
    setIsLoading((was) => was || !loaded);
    fetch(`/api/v1/products?ids=${encodeURIComponent(cartIdsKey)}&limit=100&locale=${locale}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.products)) {
          rememberProducts(locale, data.products);
          const map: Record<string, VeloceProduct> = {};
          data.products.forEach((p: VeloceProduct) => {
            map[p.id] = p;
          });
          setProductsMap(map);
        }
      })
      .catch((err) => console.warn('Could not load cart products:', err))
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
          setLoaded(true);
        }
      });
    return () => {
      isMounted = false;
    };
    // `loaded` only decides whether to show the skeleton; it must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartIdsKey, locale]);

  // Lines that are no longer sold (unpublished / deleted): tell the customer and let them clear them.
  const missingIds = loaded && !isLoading ? Object.keys(cart).filter((id) => !productsMap[id]) : [];

  const items = React.useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = productsMap[id];
          return product ? { product, quantity } : null;
        })
        .filter((e): e is { product: VeloceProduct; quantity: number } => e !== null),
    [cart, productsMap]
  );

  const unselected = React.useMemo(() => new Set(cartUnselected), [cartUnselected]);
  const available = items.filter(({ product }) => product.stock > 0);
  const isSelected = (p: VeloceProduct) => p.stock > 0 && !unselected.has(p.id);
  const selected = items.filter(({ product }) => isSelected(product));
  const allSelected = available.length > 0 && selected.length === available.length;

  const selectedUnits = selected.reduce((n, { quantity }) => n + quantity, 0);
  const totalUnits = items.reduce((n, { quantity }) => n + quantity, 0);
  const totalUSD = selected.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const depositUSD = selected.length > 0 ? depositOf(totalUSD) : 0;
  const atWorkshopUSD = Math.max(0, totalUSD - depositUSD);

  const toggleAll = () => setAllCartSelected(available.map(({ product }) => product.id), !allSelected);
  const deleteSelected = () => {
    removeLines(selected.map(({ product }) => product.id));
    setConfirmDelete(false);
  };

  const checkoutHref = `/${locale}/cart/checkout?ids=${encodeURIComponent(selected.map(({ product }) => product.id).join(','))}`;

  // --- Empty / loading -------------------------------------------------------------------------
  if (isLoading && !loaded) {
    return (
      <div className="mx-auto max-w-5xl px-5 pt-4 md:px-10 md:pt-8">
        <div className="mx-auto mb-6 h-7 w-32 rounded-lg bg-white/[0.05] motion-safe:animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 py-5">
            <div className="h-28 w-24 shrink-0 rounded-2xl bg-white/[0.05] motion-safe:animate-pulse" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-5 w-28 rounded bg-white/[0.05] motion-safe:animate-pulse" />
              <div className="h-4 w-full rounded bg-white/[0.04] motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-white/[0.04] motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0 && missingIds.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-5 pt-20 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-white/[0.04] text-gold-500">
          <ShoppingBag className="h-9 w-9" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-semibold tracking-[-0.02em] text-white">{t('emptyTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{t('emptyBody')}</p>
        <Link href={`/${locale}/shop`} className={buttonClasses({ size: 'lg', className: 'mt-8 px-8' })}>
          <span>{t('browse')}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>
    );
  }

  // --- Summary (shared by the phone bar and the desktop card) ------------------------------------
  const checkoutButton = (className?: string) =>
    selected.length > 0 ? (
      <Link href={checkoutHref} className={buttonClasses({ size: 'lg', className: cn('whitespace-nowrap px-6', className) })}>
        {t('checkoutCta')}
      </Link>
    ) : (
      <button type="button" disabled className={buttonClasses({ size: 'lg', className: cn('whitespace-nowrap px-6', className) })}>
        {t('checkoutCta')}
      </button>
    );

  return (
    <div className="mx-auto max-w-5xl px-5 pb-[170px] pt-2 md:px-10 md:pt-8 lg:pb-16">
      <h1 className="pb-4 text-center font-heading text-[22px] font-semibold tracking-[-0.02em] text-white md:pb-6 md:text-3xl">
        {t('itemsCount', { count: totalUnits })}
      </h1>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <div className="min-w-0">
          {/* Select all | delete selected */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={selected.length === 0}
              className="min-h-11 cursor-pointer whitespace-nowrap text-[14px] text-white/55 sm:text-[15px] transition hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:text-white/55"
            >
              {t('deleteSelected')}
            </button>
            <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap text-[14px] font-medium text-white sm:gap-3 sm:text-[15px]">
              <span>{t('selectAll')}</span>
              <Tick checked={allSelected} disabled={available.length === 0} onChange={toggleAll} label={t('selectAll')} />
            </label>
          </div>

          {missingIds.length > 0 && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <span>{t('missing', { count: missingIds.length })}</span>
              <button type="button" onClick={() => removeLines(missingIds)} className="min-h-9 rounded-full bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/15">
                {t('removeMissing')}
              </button>
            </div>
          )}

          <h2 className="pt-5 text-[17px] font-semibold text-white">{t('sectionTitle')}</h2>

          <ul className="divide-y divide-white/[0.08]">
            {items.map(({ product: p, quantity: q }) => {
              const sel = isSelected(p);
              const soldOut = p.stock <= 0;
              const atMax = p.stock > 0 && q >= p.stock;
              const carName = p.isUniversal ? tCard('allCars') : p.targetCar || p.compatibility?.[0]?.name || '';
              const lineUSD = p.price * q;
              const cover = p.image || p.images?.[0] || null;
              return (
                <li key={p.id} className={cn('py-5', soldOut && 'opacity-60')}>
                  <div className="flex gap-4">
                    <div className="relative h-[120px] w-[100px] shrink-0 overflow-hidden rounded-2xl bg-surface-1 sm:h-[132px] sm:w-[112px]">
                      <Link href={`/${locale}/shop/${encodeURIComponent(p.id)}`} aria-label={p.name} className="absolute inset-0">
                        {cover ? (
                          <ProductImage src={cover} alt="" sizes="112px" className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-white/25">
                            <ShoppingBag className="h-7 w-7" />
                          </span>
                        )}
                      </Link>
                      <Tick
                        checked={sel}
                        disabled={soldOut}
                        onChange={() => setCartSelected(p.id, !sel)}
                        label={t('selectItem', { name: p.name })}
                        className="absolute start-2 top-2 h-6 w-6 rounded-md"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={cn('font-display text-[20px] font-semibold leading-tight tabular-nums', sel ? 'text-gold-500' : 'text-white')}>
                        {formatPrice(lineUSD)}
                      </p>
                      <p className="mt-0.5 text-[13px] text-white/60">
                        {t('depositLine', { amount: formatPrice(depositOf(lineUSD)) })}
                      </p>
                      {soldOut && (
                        <span className="mt-2 inline-flex rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-300">
                          {t('outOfStock')}
                        </span>
                      )}
                      <Link href={`/${locale}/shop/${encodeURIComponent(p.id)}`} className="mt-2 line-clamp-2 text-[14px] leading-snug text-white hover:underline">
                        {p.name}
                      </Link>
                      {carName && (
                        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px]">
                          <Car className="h-3.5 w-3.5 shrink-0 text-gold-500" />
                          <span className="truncate text-white/80">{carName}</span>
                        </p>
                      )}
                      {p.brand && (
                        <p className="mt-1 truncate text-[13px]">
                          <span className="text-white/45">{t('brand')}</span> <span className="text-white/85">{p.brand}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {!soldOut && p.stock <= LOW_STOCK && (
                    <p className="mt-3 text-end text-[11px] font-bold uppercase tracking-wider text-orange-400">{t('left', { count: p.stock })}</p>
                  )}

                  <div className={cn('flex items-center justify-between gap-3', !soldOut && p.stock <= LOW_STOCK ? 'mt-1.5' : 'mt-4')}>
                    <button
                      type="button"
                      onClick={() => removeLines([p.id])}
                      aria-label={t('removeItem', { name: p.name })}
                      className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl bg-white/[0.06] text-white/75 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
                    >
                      <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </button>

                    <div className="flex h-11 items-center rounded-xl border border-white/15">
                      <button
                        type="button"
                        aria-label={t('decrease')}
                        onClick={() => remove(p.id)}
                        disabled={q <= 1}
                        className="grid h-full w-11 cursor-pointer place-items-center rounded-s-xl text-white transition hover:bg-white/[0.06] disabled:cursor-default disabled:text-white/25 disabled:hover:bg-transparent"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span aria-live="polite" className="min-w-[36px] text-center text-[15px] font-medium tabular-nums text-white">{q}</span>
                      <button
                        type="button"
                        aria-label={t('increase')}
                        onClick={() => add(p.id)}
                        disabled={atMax || soldOut}
                        className="grid h-full w-11 cursor-pointer place-items-center rounded-e-xl text-white transition hover:bg-white/[0.06] disabled:cursor-default disabled:text-white/25 disabled:hover:bg-transparent"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Desktop: summary card on the side */}
        <aside className="sticky top-24 hidden rounded-3xl bg-surface-1 p-6 lg:block">
          <h2 className="text-lg font-semibold text-white">{t('summaryTitle')}</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/55">{t('itemsTotal', { count: selectedUnits })}</dt>
              <dd className="tabular-nums text-white">{formatPrice(totalUSD)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/55">{t('payAtWorkshop')}</dt>
              <dd className="tabular-nums text-white">{formatPrice(atWorkshopUSD)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[0.08] pt-4">
            <span className="text-sm text-white/70">{t('payNow')}</span>
            <span className="font-display text-2xl font-semibold tabular-nums text-gold-500">{formatPrice(depositUSD)}</span>
          </div>
          {checkoutButton('mt-5 w-full')}
          <p className="mt-3 text-xs leading-relaxed text-white/45">{t('unlockNote')}</p>
        </aside>
      </div>

      {/* Phones and tablets: fixed checkout bar above the dock */}
      <div className="fixed inset-x-0 bottom-[var(--dock-h,0px)] z-30 rounded-t-3xl bg-surface-1 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.7)] md:start-24 md:bottom-0 lg:hidden">
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          <p className="border-b border-white/[0.06] py-2.5 text-center text-[12px] leading-snug text-white/65 sm:text-[13px]">
            {selected.length > 0
              ? t('barInfo', { total: formatPrice(totalUSD), rest: formatPrice(atWorkshopUSD) })
              : t('nothingSelected')}
          </p>
          <div className="flex items-center justify-between gap-3 py-3 md:pb-[max(env(safe-area-inset-bottom),14px)]">
            <div className="min-w-0">
              <p className="truncate font-display text-[20px] font-semibold leading-tight tabular-nums text-gold-500 min-[400px]:text-[24px]">{formatPrice(depositUSD)}</p>
              <p className="truncate text-[13px] text-white/55">{t('barCount', { count: selectedUnits })}</p>
            </div>
            {checkoutButton('shrink-0')}
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('confirmDeleteTitle')}
        description={t('confirmDeleteBody', { count: selected.length })}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClasses({ variant: 'ghost', size: 'md', className: 'flex-1' })}>
              {t('cancel')}
            </button>
            <button type="button" onClick={deleteSelected} className={buttonClasses({ variant: 'danger', size: 'md', className: 'flex-1' })}>
              {t('delete')}
            </button>
          </div>
        }
      >
        {null}
      </Modal>
    </div>
  );
}
