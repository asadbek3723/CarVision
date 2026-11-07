'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShoppingBag, Plus, Minus, ArrowRight, Lock, Car, Trash2 } from 'lucide-react';
import { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';

export function VeloceCart() {
  const params = useParams();
  const t = useTranslations('shop.cart');
  const tCard = useTranslations('shop.card');
  const tDetail = useTranslations('shop.detail');
  const locale = (params?.['locale'] as string) || 'uz';
  const { cart, add, remove } = useVeloceStore();
  const [broken, setBroken] = React.useState<Record<string, boolean>>({});
  const { formatPrice } = useCurrency();

  const [productsMap, setProductsMap] = React.useState<Record<string, VeloceProduct>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  const cartIdsKey = Object.keys(cart).sort().join(',');

  React.useEffect(() => {
    if (!cartIdsKey) {
      setLoaded(true);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/v1/products?ids=${encodeURIComponent(cartIdsKey)}&limit=100&locale=${locale}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.products)) {
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
  }, [cartIdsKey, locale]);

  // Items in the cart that are no longer sold (unpublished / deleted): tell the customer, let them clear them
  const missingIds = loaded && !isLoading ? Object.keys(cart).filter((id) => !productsMap[id]) : [];
  const dropMissing = () => {
    for (const id of missingIds) for (let i = 0; i < (cart[id] ?? 1); i++) remove(id);
  };

  const items = React.useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = productsMap[id];
        return product ? { product, quantity } : null;
      })
      .filter(
        (entry): entry is { product: VeloceProduct; quantity: number } =>
          entry !== null
      );
  }, [cart, productsMap]);

  const totalUSD = items.reduce((sum, { product, quantity }) => {
    const unitUSD = product.price;
    return sum + unitUSD * quantity;
  }, 0);

  const deposit3PercentUSD = Math.max(1, Math.round(totalUSD * 0.03));

  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-24 md:px-10 md:pt-12">
      <div className="mb-8">
        <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-gold-500">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-2xl font-light text-white sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-xs text-white/55 sm:text-sm">
          {t('intro')}
        </p>
      </div>

      {missingIds.length > 0 && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
          <span>{t('missing', { count: missingIds.length })}</span>
          <button type="button" onClick={dropMissing} className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15">{t('removeMissing')}</button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-white/25" />
          <h2 className="mt-4 font-display text-xl font-light text-white">
            {t('empty')}
          </h2>
          <Link
            href={`/${locale}/shop`}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-7 py-3.5 text-xs font-bold tracking-wider uppercase text-black"
          >
            <span>{t('browse')}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Clean Boxless List */}
          <div className="divide-y divide-white/[0.06]">
            {items.map(({ product: p, quantity: q }) => {
              const unitUSD = p.price;
              const carName = p.isUniversal ? tCard('allCars') : p.targetCar || p.compatibility?.[0]?.name || '';
              const atMax = p.stock > 0 && q >= p.stock;
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    {p.image && !broken[p.id] ? (
                      <img src={p.image} alt={p.name} onError={() => setBroken((b) => ({ ...b, [p.id]: true }))} className="h-20 w-24 shrink-0 rounded-2xl bg-[#12141C] object-cover" />
                    ) : (
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#12141C] text-[10px] uppercase tracking-widest text-white/30">{tDetail('noImage')}</div>
                    )}
                    <div>
                      {carName && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-500">
                          <Car className="h-3.5 w-3.5" />
                          <span>{t('forCar', { car: carName })}</span>
                        </span>
                      )}
                      {p.stock <= 0 && <p className="text-[11px] font-semibold text-red-300">{t('outOfStock')}</p>}
                      <h3 className="mt-0.5 text-base font-medium text-white">{p.name}</h3>
                      <p className="mt-1 font-mono text-sm font-semibold text-white/80 tabular-nums">
                        {t('price', { amount: formatPrice(unitUSD) })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-1.5">
                      <button
                        type="button"
                        aria-label={t('decrease')}
                        onClick={() => remove(p.id)}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/[0.08]"
                      >
                        {q <= 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                      <span className="min-w-[24px] text-center font-mono text-xs font-bold text-white">
                        {q}
                      </span>
                      <button
                        type="button"
                        aria-label={t('increase')}
                        disabled={atMax}
                        onClick={() => add(p.id)}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Summary & Unlock CTA */}
          <div className="rounded-3xl bg-[#12151E] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Lock className="h-3.5 w-3.5 text-gold-500" />
                  <span>{t('unlockNote')}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-sm text-white/60">{t('depositNow')}</span>
                  <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums sm:text-3xl">
                    {formatPrice(deposit3PercentUSD)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {t('totalAtWorkshop', { amount: formatPrice(totalUSD) })}
                </p>
              </div>

              <Link
                aria-disabled={items.some(({ product }) => product.stock <= 0)}
                href={`/${locale}/cart/checkout`}
                className="shimmer inline-flex items-center justify-center gap-3 rounded-2xl bg-gold-gradient px-8 py-4 text-xs font-bold tracking-wider uppercase text-black shadow-[0_12px_30px_rgba(212,174,98,0.25)] transition hover:brightness-110"
              >
                <span>{t('payCta')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
