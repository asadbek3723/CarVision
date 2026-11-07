'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Camera, Car, Loader2, Plus } from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { CatalogItemDTO } from '@/domain/catalog';
import { StudioLock } from '@/features/seller/components/StudioLock';
import { buttonClasses } from '@/components/ui';

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

  const [items, setItems] = React.useState<CatalogItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState(ALL);

  const isSeller = user?.plan?.isPaid === true;

  React.useEffect(() => {
    if (authLoading) return;
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
        if (!cancelled) setItems((data.items as CatalogItemDTO[]).filter((i) => i.status === 'PUBLISHED'));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isSeller]);

  const categories = React.useMemo(() => [ALL, ...new Set(items.map((i) => i.category))], [items]);
  const visible = items.filter((i) => activeCategory === ALL || i.category === activeCategory);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
      </div>
    );
  }

  if (user && !isSeller) return <StudioLock feature="garage" />;

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
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-6 md:px-10 md:pt-10">
      <div className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold-500">{t('eyebrow')}</p>
          <h1 className="mt-1 text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{user?.shop?.shop_name ?? t('defaultName')}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={openCamera} className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white/[0.06] px-5 py-3.5 text-xs font-semibold text-white transition hover:bg-white/[0.12]">
            <Camera className="h-4 w-4 text-gold-500" />
            <span>{t('tryOnCustomer')}</span>
          </button>
          <Link href={`/${locale}/seller/new-part`} className={buttonClasses({ size: 'md' })}>
            <Plus className="h-4 w-4" />
            <span>{t('addPart')}</span>
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="mb-6 text-sm text-red-300">{t('loadError')}</p>}

      {items.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-white/60">
          {t('empty')}
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`cursor-pointer rounded-2xl px-4 py-2.5 text-xs font-medium transition ${activeCategory === cat ? 'bg-gold-500 font-semibold text-black' : 'bg-white/[0.04] text-white/65 hover:text-white'}`}
              >
                {cat === ALL ? t('all') : tCat(cat)}
              </button>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((item) => (
              <div key={item.id} className="group flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#11131A] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                    {item.coverImageUrl && <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                  </div>
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-500">
                      <Car className="h-3.5 w-3.5" />
                      <span>{item.isUniversal ? t('allCars') : item.fitment[0]?.label ?? '—'}</span>
                    </span>
                    <h3 className="mt-0.5 line-clamp-1 text-sm font-medium text-white">{item.name}</h3>
                    <p className="mt-1 font-mono text-sm font-bold tabular-nums text-white/90">{formatPrice(item.priceUSD)}</p>
                    <p className={`mt-0.5 text-[11px] ${item.stock === 0 ? 'text-red-300' : 'text-white/45'}`}>{t('stock', { count: item.stock })}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Link href={`/${locale}/seller/new-part?id=${item.id}`} className="text-xs text-white/55 hover:text-white">
                    {t('edit')}
                  </Link>
                  <Link href={`/${locale}/customize?partId=${encodeURIComponent(item.id)}`} className="text-xs font-semibold text-gold-500 hover:underline">
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
