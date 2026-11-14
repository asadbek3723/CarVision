import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import { CATALOG_CATEGORIES, localizedText, type CatalogCategory, type CatalogItemDTO } from '@/domain/catalog';
import { ProductImage } from '@/components/ui/ProductImage';
import { Wordmark } from '@/components/ui/Wordmark';
import { geist, md, mdFocus } from '@/features/minimal/theme';
import { CATALOG_COPY, CATEGORY_NAMES, brandNotInName, categoryUrlSlug, seoCategory } from '@/lib/seo/categories';
import { SEO_COPY } from '@/lib/seo/copy';
import { itemFitLabels, itemImageUrls } from '@/server/catalog-seo';
import { CARS_COPY, type CarModel } from '@/lib/seo/cars';

const CARS_BY_CAR = Object.fromEntries(Object.entries(CARS_COPY).map(([l, c]) => [l, c.byCar])) as Record<Locale, string>;

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: value < 100 ? 2 : 0 })}`;
}

/**
 * Server-rendered catalog: every published part as a plain link with its photo, name, brand,
 * category, price and fitment. It exists so search engines and AI crawlers can reach and read
 * every part without running the shop's JavaScript; people get a fast, simple list too.
 */
export interface DirectoryCrumb {
  name: string;
  /** Missing on the current page. */
  href?: string | undefined;
}

export interface CatalogDirectoryProps {
  locale: Locale;
  items: CatalogItemDTO[];
  counts: Partial<Record<CatalogCategory, number>>;
  active: CatalogCategory | null;
  /** Defaults: the catalog heading / the category name, and the catalog intro. */
  heading?: string | undefined;
  intro?: string | undefined;
  /** Breadcrumb after "Home". Default: Catalog [/ category]. */
  crumbs?: DirectoryCrumb[] | undefined;
  /** Where the "all" chip and each category chip lead. Default: the catalog pages. */
  allHref?: string | undefined;
  categoryHref?: ((slug: CatalogCategory) => string) | undefined;
  /** Car models to link to (the "by car" chips). */
  cars?: CarModel[] | undefined;
  activeCar?: string | undefined;
  /** A second list under the main one (universal parts on a car page) with its heading. */
  extra?: { heading: string; items: CatalogItemDTO[] } | undefined;
}

/**
 * Server-rendered catalog: every published part as a plain link with its photo, name, brand,
 * category, price and fitment. It exists so search engines and AI crawlers can reach and read
 * every part without running the shop's JavaScript; people get a fast, simple list too.
 */
export function CatalogDirectory({
  locale,
  items,
  counts,
  active,
  heading,
  intro,
  crumbs,
  allHref,
  categoryHref,
  cars,
  activeCar,
  extra,
}: CatalogDirectoryProps) {
  const copy = CATALOG_COPY[locale];
  const names = CATEGORY_NAMES[locale];
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const title = heading ?? (active ? names[active] : copy.h1);
  const trail: DirectoryCrumb[] =
    crumbs ??
    (active
      ? [{ name: SEO_COPY[locale].breadcrumbShop, href: `/${locale}/catalog` }, { name: names[active] }]
      : [{ name: SEO_COPY[locale].breadcrumbShop }]);
  const hrefAll = allHref ?? `/${locale}/catalog`;
  const hrefFor = categoryHref ?? ((slug: CatalogCategory) => `/${locale}/catalog/${categoryUrlSlug(slug)}`);
  const chip = (on: boolean) =>
    `inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] ${mdFocus} ${
      on ? 'border-[#FDC902] bg-[#FDC902]/[0.14] text-[#FDC902]' : `${md.line} ${md.card} text-white/80`
    }`;

  return (
    <div className={`${geist.className} ${md.page} min-h-dvh text-white`}>
      <header className={`sticky top-0 z-10 border-b ${md.line} bg-[#0A0A0A]/90 backdrop-blur`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={`/${locale}`} aria-label="CarVision" className={`rounded-lg ${mdFocus}`}>
            <Wordmark />
          </Link>
          <Link
            href={`/${locale}/shop`}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-medium ${md.accentBg} text-[#0A0A0A] ${mdFocus}`}
          >
            {copy.openShop}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <nav aria-label="Breadcrumb" className={`text-xs ${md.faint}`}>
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={`/${locale}`} className="hover:text-white">
                {SEO_COPY[locale].breadcrumbHome}
              </Link>
            </li>
            {trail.map((c, i) => (
              <React.Fragment key={`${c.name}-${i}`}>
                <li aria-hidden>/</li>
                {c.href ? (
                  <li>
                    <Link href={c.href} className="hover:text-white">
                      {c.name}
                    </Link>
                  </li>
                ) : (
                  <li aria-current="page" className="text-white">
                    {c.name}
                  </li>
                )}
              </React.Fragment>
            ))}
          </ol>
        </nav>

        <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">{title}</h1>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${md.muted}`}>{intro ?? copy.intro}</p>

        <nav aria-label={copy.allCategories} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href={hrefAll} className={chip(!active)} aria-current={active ? undefined : 'page'}>
                {copy.allCategories}
                <span className={md.faint}>{total}</span>
              </Link>
            </li>
            {CATALOG_CATEGORIES.filter((c) => (counts[c.slug] ?? 0) > 0).map((c) => (
              <li key={c.slug}>
                <Link href={hrefFor(c.slug)} className={chip(active === c.slug)} aria-current={active === c.slug ? 'page' : undefined}>
                  {names[c.slug]}
                  <span className={md.faint}>{counts[c.slug]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {cars && cars.length > 0 && (
          <nav aria-label={CARS_BY_CAR[locale]} className="mt-4">
            <p className={`mb-2 text-xs uppercase tracking-[0.06em] ${md.faint}`}>{CARS_BY_CAR[locale]}</p>
            <ul className="flex flex-wrap gap-2">
              {cars.map((car) => (
                <li key={car.slug}>
                  <Link href={`/${locale}/cars/${car.slug}`} className={chip(activeCar === car.slug)} aria-current={activeCar === car.slug ? 'page' : undefined}>
                    {car.label}
                    <span className={md.faint}>{car.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className={`mt-8 text-xs uppercase tracking-[0.06em] ${md.faint}`}>{copy.parts(items.length)}</p>
        {items.length === 0 ? (
          <p className={`mt-4 rounded-[18px] ${md.card} p-6 text-sm ${md.muted}`}>{copy.empty}</p>
        ) : (
          <PartGrid locale={locale} items={items} />
        )}

        {extra && extra.items.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold">{extra.heading}</h2>
            <p className={`mt-1 text-xs uppercase tracking-[0.06em] ${md.faint}`}>{copy.parts(extra.items.length)}</p>
            <PartGrid locale={locale} items={extra.items} />
          </section>
        )}
      </main>
    </div>
  );
}

function PartGrid({ locale, items }: { locale: Locale; items: CatalogItemDTO[] }) {
  const copy = CATALOG_COPY[locale];
  const names = CATEGORY_NAMES[locale];
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const text = localizedText(item, locale);
        const image = itemImageUrls(item, 1)[0];
        const fits = itemFitLabels(item, 3);
        const category = names[seoCategory(item)] ?? item.categoryLabel;
        return (
          <li key={item.id} className="min-w-0">
            <article>
              <Link href={`/${locale}/shop/${item.id}`} className={`group flex min-w-0 flex-col rounded-[18px] ${mdFocus}`}>
                <div className={`relative aspect-square overflow-hidden rounded-[18px] ${md.card}`}>
                  {image && (
                    <ProductImage
                      src={image}
                      alt={[brandNotInName(item.brand, text.name), text.name, category].filter(Boolean).join(' — ')}
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
                      className="object-cover transition duration-500 md:group-hover:scale-105"
                    />
                  )}
                </div>
                <span className={`mt-3 truncate text-[10px] font-medium uppercase leading-none tracking-[0.06em] ${md.faint}`}>
                  {item.brand || category}
                </span>
                <h2 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[14px] font-medium leading-[1.3] text-white">{text.name}</h2>
                <span className="mt-2 text-[15px] font-semibold leading-none tabular-nums text-white">{usd(item.priceUSD)}</span>
              </Link>
              <p className={`mt-1.5 line-clamp-2 text-[12px] leading-snug ${md.faint}`}>
                {item.isUniversal ? copy.universal : fits.length ? `${copy.fits}: ${fits.join(', ')}` : category}
              </p>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
