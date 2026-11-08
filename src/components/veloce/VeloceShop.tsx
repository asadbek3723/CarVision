'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCategoryLabel } from '@/lib/category-label';
import { Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
import { MinimalProductCard } from '@/components/veloce/MinimalProductCard';
import { MyCarPicker } from '@/features/shop/MyCarPicker';
import { useMyCar } from '@/features/shop/useMyCar';
import type { VeloceProduct } from '@/domain/veloce-catalog';
import { useVeloceStore } from '@/context/VeloceStore';
import { geist, md, mdFocus } from '@/features/minimal/theme';
import { rememberProducts } from '@/features/shop/product-cache';

interface Facets {
  brands: string[];
  categories: string[];
}

/**
 * Last answer per query, kept for the life of the tab. Coming back to the shop (tab switch, back
 * button) paints the previous list at once and refreshes it quietly, instead of showing skeletons.
 */
const listCache = new Map<string, { products: VeloceProduct[]; facets: Facets }>();
/** Cards drawn first; the rest follow as the visitor scrolls, so 120 products never block one frame. */
const PAGE = 24;

export function VeloceShop() {
  const t = useTranslations('shop.list');
  const tNav = useTranslations('nav');
  const { count } = useVeloceStore();
  const categoryLabel = useCategoryLabel();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { car, filterQuery } = useMyCar();

  const [products, setProducts] = React.useState<VeloceProduct[]>([]);
  const [facets, setFacets] = React.useState<Facets>({ brands: [], categories: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [category, setCategory] = React.useState('All');
  const [brand, setBrand] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [visible, setVisible] = React.useState(PAGE);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const qs = ['limit=120', `locale=${locale}`, filterQuery].filter(Boolean).join('&');
    const cached = listCache.get(qs);
    if (cached) {
      setProducts(cached.products);
      setFacets(cached.facets);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(false);
    (async () => {
      try {
        const res = await fetch(`/api/v1/products?${qs}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('load failed');
        const next = { products: (data.products ?? []) as VeloceProduct[], facets: (data.facets ?? { brands: [], categories: [] }) as Facets };
        listCache.set(qs, next);
        rememberProducts(locale, next.products);
        if (!cancelled) {
          setProducts(next.products);
          setFacets(next.facets);
        }
      } catch {
        if (!cancelled && !cached) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterQuery, locale]);

  // A new filter or search starts again from the first screenful.
  React.useEffect(() => setVisible(PAGE), [category, brand, query]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'All' && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (brand && p.brand.toLowerCase() !== brand.toLowerCase()) return false;
      if (!q) return true;
      return `${p.name} ${p.brand} ${p.spec ?? ''}`.toLowerCase().includes(q);
    });
  }, [products, category, brand, query]);

  const chip = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-full border text-[13px] font-medium leading-none transition ${mdFocus} ${
      active ? 'border-[#FDC902] bg-[#FDC902] text-[#0A0A0A]' : `${md.line} ${md.card} text-white hover:bg-[#1c1c1c]`
    }`;

  const shown = filtered.slice(0, visible);
  const depositBanner = (
    <div className={`flex items-center gap-3.5 rounded-[20px] p-4 ${md.card}`}>
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${md.accentSoft} ${md.accentText}`}>
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-medium leading-tight text-white">{t('depositTitle')}</p>
        <p className={`mt-1 text-[13px] leading-[1.35] ${md.muted}`}>{t('depositBody')}</p>
      </div>
    </div>
  );

  return (
    <div className={`${geist.className} ${md.page} min-h-full`}>
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-3 md:px-10 md:pt-8">
        {/* Title row */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-white md:text-[40px]">{t('title')}</h1>
            <p className={`mt-2 text-[14px] leading-snug ${md.muted}`}>{t('subtitle')}</p>
          </div>
          <Link
            href={`/${locale}/cart`}
            aria-label={count > 0 ? tNav('cartWithCount', { count }) : tNav('cart')}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border ${md.line} ${md.card} text-white transition hover:bg-[#1c1c1c] ${mdFocus}`}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
            {count > 0 && (
              <span className={`absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums text-[#0A0A0A] ${md.accentBg}`}>
                {count}
              </span>
            )}
          </Link>
        </header>

        {/* Search + filters */}
        <div className="mt-5 flex items-center gap-2.5">
          <label className={`flex h-12 min-w-0 flex-1 cursor-text items-center gap-2.5 rounded-[14px] border px-3.5 transition focus-within:border-[#FDC902]/50 ${md.line} ${md.card}`}>
            <Search className={`h-[18px] w-[18px] shrink-0 ${md.faint}`} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              enterKeyHint="search"
              className="w-full min-w-0 bg-transparent text-[14px] text-white outline-none placeholder:text-[#6B6B6B]"
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label={t('filters')}
            className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-[#0A0A0A] transition active:scale-95 ${md.accentBg} ${mdFocus}`}
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={2} />
            {brand && <span aria-hidden className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[#0A0A0A]" />}
          </button>
        </div>

        {/* Brand filter, opened by the yellow button */}
        {filtersOpen && facets.brands.length > 0 && (
          <div className={`mt-3 rounded-[20px] p-4 ${md.card}`}>
            <p className={`text-[12px] font-medium ${md.muted}`}>{t('brands')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {facets.brands.map((b) => (
                <button key={b} type="button" onClick={() => setBrand(brand === b ? null : b)} aria-pressed={brand === b} className={`${chip(brand === b)} h-9 px-4`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <MyCarPicker />
        </div>

        {/* Categories: one edge-to-edge strip on phones */}
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          {['All', ...facets.categories].map((cat) => (
            <button key={cat} type="button" onClick={() => setCategory(cat)} aria-pressed={category === cat} className={`${chip(category === cat)} h-[37px] px-4`}>
              {cat === 'All' ? t('all') : categoryLabel(cat)}
            </button>
          ))}
        </div>

        <div className="mb-4 mt-6 flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-white">
            {car ? t('forCar', { car: car.label }) : t('allParts')}
          </h2>
          <span className={`shrink-0 text-[13px] tabular-nums ${md.faint}`}>{loading ? t('loading') : t('count', { count: filtered.length })}</span>
        </div>

        {/* Desktop: the deposit note sits above the grid */}
        <div className="mb-6 hidden md:block">{depositBanner}</div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className={`aspect-square animate-pulse rounded-[18px] ${md.card}`} />
                <div className={`mt-3 h-2.5 w-1/2 animate-pulse rounded ${md.card}`} />
                <div className={`mt-2 h-3.5 w-4/5 animate-pulse rounded ${md.card}`} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-20 text-center text-sm text-red-300">{t('loadError')}</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-10 xl:grid-cols-4">
            {shown.map((p, idx) => (
              <React.Fragment key={p.id}>
                <MinimalProductCard p={p} i={idx} />
                {/* Phones: after the first row, as in the design */}
                {idx === Math.min(1, shown.length - 1) && <div className="col-span-full md:hidden">{depositBanner}</div>}
              </React.Fragment>
            ))}
            {visible < filtered.length && <MoreSentinel onVisible={() => setVisible((v) => v + PAGE)} />}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span aria-hidden className={`grid h-14 w-14 place-items-center rounded-2xl ${md.card} ${md.accentText}`}>
              <Sparkles className="h-6 w-6" />
            </span>
            <p className={`text-sm ${md.muted}`}>{car ? t('noPartsForCar', { car: car.label }) : t('noParts')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Invisible marker at the end of the list: when it nears the screen the next batch of cards is added. */
function MoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      onVisible();
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onVisible(), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);
  return <div ref={ref} aria-hidden className="col-span-full h-px" />;
}
