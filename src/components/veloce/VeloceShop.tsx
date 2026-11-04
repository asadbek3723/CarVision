'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/veloce/ProductCard';
import { MyCarPicker } from '@/features/shop/MyCarPicker';
import { useMyCar } from '@/features/shop/useMyCar';
import { useCurrency } from '@/context/CurrencyContext';
import type { VeloceProduct } from '@/domain/veloce-catalog';

interface Facets {
  brands: string[];
  categories: string[];
}

export function VeloceShop() {
  const t = useTranslations('shop.list');
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

  const featured = products[0];

  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 md:px-10">
      <label className="rise flex items-center gap-3 rounded-full border border-primary/20 bg-card px-5 py-3.5 transition focus-within:border-primary focus-within:shadow-gold cursor-text">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-4">
        <MyCarPicker />
      </div>

      {featured && !car && (
        <section className="rise relative mt-6 overflow-hidden rounded-3xl border border-primary/40 bg-card-gradient shadow-gold" style={{ animationDelay: '100ms' }}>
          <div className="grid items-center md:grid-cols-2">
            <div className="relative z-10 p-7 md:p-12">
              <span className="text-[10px] font-semibold uppercase tracking-luxe text-primary">{t('badgeNew')}</span>
              <h1 className="mt-3 font-display text-2xl tracking-[0.1em] text-white md:text-4xl">{featured.name}</h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {featured.brand} · {formatPrice(featured.price)}
              </p>
              <Link
                href={`/${locale}/shop/${featured.id}`}
                className="shimmer mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black shadow-gold transition hover:brightness-110 active:scale-95"
              >
                {t('view')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
            {featured.image && <img src={featured.image} alt={featured.name} className="h-56 w-full object-cover md:h-full" />}
          </div>
        </section>
      )}

      <div className="mt-8 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {['All', ...facets.categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 cursor-pointer rounded-full border px-5 py-2 text-xs uppercase tracking-widest transition ${
              category === cat ? 'border-transparent bg-gold-gradient font-semibold text-black shadow-gold' : 'border-primary/20 text-muted-foreground hover:border-primary hover:text-foreground'
            }`}
          >
            {cat === 'All' ? t('all') : cat}
          </button>
        ))}
      </div>

      {facets.brands.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {facets.brands.map((b) => (
            <button
              key={b}
              onClick={() => setBrand(brand === b ? null : b)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-[11px] font-medium transition ${brand === b ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/10'}`}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 mt-8 flex justify-between text-sm uppercase tracking-[0.2em]">
        <span className="font-medium text-white">{car ? t('forCar', { car: car.label }) : t('allParts')}</span>
        <span className="text-muted-foreground">{loading ? t('loading') : t('count', { count: filtered.length })}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl border border-primary/10 bg-white/[0.02]" />
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
