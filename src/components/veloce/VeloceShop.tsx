'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCategoryLabel } from '@/lib/category-label';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/veloce/ProductCard';
import { MyCarPicker } from '@/features/shop/MyCarPicker';
import { useMyCar } from '@/features/shop/useMyCar';
import { useCurrency } from '@/context/CurrencyContext';
import type { VeloceProduct } from '@/domain/veloce-catalog';
import { buttonClasses } from '@/components/ui';

interface Facets {
  brands: string[];
  categories: string[];
}

export function VeloceShop() {
  const t = useTranslations('shop.list');
  const categoryLabel = useCategoryLabel();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();
  const { car, filterQuery } = useMyCar();

  const [products, setProducts] = React.useState<VeloceProduct[]>([]);
  const [facets, setFacets] = React.useState<Facets>({ brands: [], categories: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [category, setCategory] = React.useState('All');
  const [brand, setBrand] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const qs = ['limit=120', `locale=${locale}`, filterQuery].filter(Boolean).join('&');
        const res = await fetch(`/api/v1/products?${qs}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('load failed');
        if (!cancelled) {
          setProducts(data.products ?? []);
          setFacets(data.facets ?? { brands: [], categories: [] });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterQuery, locale]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'All' && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (brand && p.brand.toLowerCase() !== brand.toLowerCase()) return false;
      if (!q) return true;
      return `${p.name} ${p.brand} ${p.spec ?? ''}`.toLowerCase().includes(q);
    });
  }, [products, category, brand, query]);

  // The banner needs a real photo: colour swatches and parts without images never lead it.
  const featured = products.find((p) => Boolean(p.image) && !p.swatch) ?? products[0];

  const chip = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-full transition ${active ? 'bg-gold-500 font-semibold text-ink' : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.09] hover:text-white'}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 md:px-10 md:pt-6">
      {/* Search */}
      <label className="flex h-12 cursor-text items-center gap-3 rounded-full bg-white/[0.05] px-4 transition focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-gold-500/30 md:h-14 md:px-5">
        <Search className="h-[18px] w-[18px] shrink-0 text-white/45" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          enterKeyHint="search"
          className="w-full min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
        />
      </label>

      <div className="mt-3">
        <MyCarPicker />
      </div>

      {/* Featured part: a compact card on phones, the large banner on desktop */}
      {featured && !car && (
        <Link
          href={`/${locale}/shop/${featured.id}`}
          className="mt-4 flex items-center gap-4 overflow-hidden rounded-2xl bg-surface-1 p-2.5 pe-4 md:hidden"
        >
          {featured.image && <img src={featured.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500">{t('badgeNew')}</span>
            <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug text-white">{featured.name}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-gold-300">{formatPrice(featured.price)}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/40 rtl:rotate-180" />
        </Link>
      )}
      {featured && !car && (
        <section className="rise relative mt-6 hidden overflow-hidden rounded-3xl bg-card-gradient shadow-gold md:block" style={{ animationDelay: '100ms' }}>
          <div className="grid items-center md:grid-cols-2">
            <div className="relative z-10 p-12">
              <span className="text-[10px] font-semibold uppercase tracking-luxe text-primary">{t('badgeNew')}</span>
              <h1 className="mt-3 font-display text-4xl tracking-[0.1em] text-white">{featured.name}</h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {featured.brand} · {formatPrice(featured.price)}
              </p>
              <Link href={`/${locale}/shop/${featured.id}`} className={buttonClasses({ size: 'md', className: 'mt-6' })}>
                {t('view')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
            {featured.image && <img src={featured.image} alt={featured.name} className="h-[360px] w-full object-cover" />}
          </div>
        </section>
      )}

      {/* Categories: one edge-to-edge strip on phones */}
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-8 md:px-0 [&::-webkit-scrollbar]:hidden">
        {['All', ...facets.categories].map((cat) => (
          <button key={cat} type="button" onClick={() => setCategory(cat)} className={`${chip(category === cat)} h-9 px-4 text-[13px] md:h-11 md:px-5`}>
            {cat === 'All' ? t('all') : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Brands: a desktop refinement; on phones the categories are enough */}
      {facets.brands.length > 0 && (
        <div className="mt-3 hidden gap-2 overflow-x-auto [scrollbar-width:none] md:flex">
          {facets.brands.map((b) => (
            <button key={b} type="button" onClick={() => setBrand(brand === b ? null : b)} className={`${chip(brand === b)} px-4 py-1.5 text-[11px] font-medium`}>
              {b}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 mt-6 flex items-baseline justify-between gap-3 md:mb-4 md:mt-8">
        <h2 className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-white md:text-sm md:tracking-[0.2em]">
          {car ? t('forCar', { car: car.label }) : t('allParts')}
        </h2>
        <span className="shrink-0 text-[13px] tabular-nums text-white/45">{loading ? t('loading') : t('count', { count: filtered.length })}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : error ? (
        <div className="py-20 text-center text-sm text-red-300">{t('loadError')}</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 pb-16 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {filtered.map((p, idx) => (
            <ProductCard key={p.id} p={p} i={idx} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 text-primary/60" />
          <p className="text-sm">{car ? t('noPartsForCar', { car: car.label }) : t('noParts')}</p>
        </div>
      )}
    </div>
  );
}
