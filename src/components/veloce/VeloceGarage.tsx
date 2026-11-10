'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Camera, Car, Loader2, Plus } from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { cachedInventory, rememberInventory } from '@/features/seller/lib/inventory-cache';
import { ProductImage } from '@/components/ui/ProductImage';
import { localizedText, type CatalogItemDTO } from '@/domain/catalog';
import { SellerOnly } from '@/features/seller/components/SellerOnly';
import { isSellerUser } from '@/features/auth/roles';
import { buttonClasses } from '@/components/ui';
import { useLiveTick, useRetryTick } from '@/lib/live';

/** Workshop garage: the studio's own published parts, ready to try on a customer's car. */
/** Internal sentinel for the "all categories" chip; never shown to the user. */
const ALL = '__all__';

export function VeloceGarage() {
  const t = useTranslations('garagePage');
  const tCat = useTranslations('catalogCat');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { openCamera } = useVeloceStore();
  const { formatPrice } = useCurrency();
  const { user, isLoading: authLoading } = useAuth();

  const [items, setItems] = React.useState<CatalogItemDTO[]>(() => (cachedInventory(user?.id) ?? []).filter((i) => i.status === 'PUBLISHED'));
  const [loading, setLoading] = React.useState(() => !cachedInventory(user?.id));
  const [error, setError] = React.useState(false);
  // The profile saved on this device is enough to start; the server check of the session runs alongside.
  const waitingForUser = authLoading && !user;
  const [activeCategory, setActiveCategory] = React.useState(ALL);

  const isSeller = isSellerUser(user);
  const live = useLiveTick();
  const retry = useRetryTick(error);

  React.useEffect(() => {
    if (waitingForUser) return;
    if (!isSeller) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/seller/inventory', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error();
        rememberInventory(user?.id, data.items as CatalogItemDTO[]);
        if (!cancelled) setError(false);
        if (!cancelled) setItems((data.items as CatalogItemDTO[]).filter((i) => i.status === 'PUBLISHED'));
      } catch {
        if (!cancelled && !cachedInventory(user?.id)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [waitingForUser, isSeller, user?.id, live, retry]);

  const categories = React.useMemo(() => [ALL, ...new Set(items.map((i) => i.category))], [items]);
  const visible = items.filter((i) => activeCategory === ALL || i.category === activeCategory);

  if (waitingForUser || loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
      </div>
    );
  }

  if (user && !isSeller) return <SellerOnly />;

  if (!user) {
    return (
      <div className="mx-auto mt-16 max-w-md px-5 text-center">
        <p className="text-sm text-white/70">{t('loginRequired')}</p>
        <Link href={`/${locale}/login`} className={buttonClasses({ size: 'sm', className: 'mt-4' })}>
          {t('login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-6 md:px-10 md:pt-10">
      <header className="pb-6 sm:flex sm:items-end sm:justify-between sm:gap-6 sm:pb-8">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-500 sm:text-xs">{t('eyebrow')}</p>
          <h1 className="mt-1.5 truncate font-heading text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">
            {user?.shop?.shop_name ?? t('defaultName')}
          </h1>
          {items.length > 0 && <p className="mt-1 text-sm text-white/45">{t('count', { count: items.length })}</p>}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-0 sm:flex sm:shrink-0 sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={openCamera}
            className="flex h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-white/[0.06] px-4 text-[13px] font-semibold text-white transition hover:bg-white/[0.1] active:scale-[0.98] sm:h-auto sm:rounded-2xl sm:px-5 sm:py-3.5 sm:text-xs"
          >
            <Camera className="h-4 w-4 shrink-0 text-gold-500" />
            <span className="truncate">{t('tryOnCustomer')}</span>
          </button>
          <Link
            href={`/${locale}/seller/new-part`}
            className={buttonClasses({ size: 'md', className: 'h-12 min-w-0 !rounded-full px-4 text-[13px] active:scale-[0.98] sm:h-auto sm:text-sm' })}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('addPart')}</span>
          </Link>
        </div>
      </header>

      {error && <p role="alert" className="mb-6 text-sm text-red-300">{t('loadError')}</p>}

      {items.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-white/60">
          {t('empty')}
        </div>
      ) : (
        <>
          <div className="-mx-5 mb-6 flex snap-x items-center gap-1.5 overflow-x-auto scroll-px-5 px-5 pb-1 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-28px),transparent)] [scrollbar-width:none] sm:mx-0 sm:mb-8 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`h-9 shrink-0 cursor-pointer snap-start whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition sm:h-auto sm:rounded-2xl sm:py-2.5 sm:text-xs ${activeCategory === cat ? 'bg-gold-500 font-semibold text-black' : 'bg-white/[0.04] text-white/60 hover:text-white'}`}
              >
                {cat === ALL ? t('all') : tCat(cat)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-6 lg:grid-cols-4">
            {visible.map((item) => (
              <div key={item.id} className="group flex min-w-0 flex-col justify-between">
                <Link
                  href={`/${locale}/shop/${encodeURIComponent(item.id)}?from=garage`}
                  className="block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/40"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#11131A] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                    {item.coverImageUrl && (
                      <ProductImage
                        src={item.coverImageUrl}
                        alt={localizedText(item, locale).name}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="mt-2.5 min-w-0 sm:mt-3">
                    <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-gold-500">
                      <Car className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.isUniversal ? t('allCars') : item.fitment[0]?.label ?? '—'}</span>
                    </span>
                    <h3 className="mt-0.5 line-clamp-1 text-sm font-medium text-white">{localizedText(item, locale).name}</h3>
                    <p className="mt-1 truncate font-mono text-sm font-bold tabular-nums text-white/90">{formatPrice(item.priceUSD)}</p>
                    <p className={`mt-0.5 text-[11px] ${item.stock === 0 ? 'text-red-300' : 'text-white/45'}`}>{t('stock', { count: item.stock })}</p>
                  </div>
                </Link>
                <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
                  <Link href={`/${locale}/seller/new-part?id=${item.id}`} className="flex min-h-9 items-center text-xs text-white/55 hover:text-white">
                    {t('edit')}
                  </Link>
                  <Link href={`/${locale}/customize?partId=${encodeURIComponent(item.id)}`} className="flex min-h-9 items-center truncate text-xs font-semibold text-gold-500 hover:underline">
                    {t('tryOn')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
