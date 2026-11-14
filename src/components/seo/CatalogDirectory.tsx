import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import { CATALOG_CATEGORIES, localizedText, type CatalogCategory, type CatalogItemDTO } from '@/domain/catalog';
import { ProductImage } from '@/components/ui/ProductImage';
import { Wordmark } from '@/components/ui/Wordmark';
import { geist, md, mdFocus } from '@/features/minimal/theme';
import { CATALOG_COPY, CATEGORY_NAMES, categoryUrlSlug } from '@/lib/seo/categories';
import { SEO_COPY } from '@/lib/seo/copy';
import { itemFitLabels, itemImageUrls } from '@/server/catalog-seo';

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: value < 100 ? 2 : 0 })}`;
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
}: {
  locale: Locale;
  items: CatalogItemDTO[];
  counts: Partial<Record<CatalogCategory, number>>;
  active: CatalogCategory | null;
}) {
  const copy = CATALOG_COPY[locale];
  const names = CATEGORY_NAMES[locale];
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const heading = active ? names[active] : copy.h1;

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
            <li aria-hidden>/</li>
            <li>
              <Link href={`/${locale}/catalog`} className="hover:text-white" aria-current={active ? undefined : 'page'}>
                {SEO_COPY[locale].breadcrumbShop}
              </Link>
            </li>
            {active && (
              <>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white">
                  {names[active]}
                </li>
              </>
            )}
          </ol>
        </nav>

        <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">{heading}</h1>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${md.muted}`}>{copy.intro}</p>

        <nav aria-label={copy.allCategories} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={`/${locale}/catalog`}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] ${mdFocus} ${
                  active ? `${md.line} ${md.card} text-white/80` : 'border-[#FDC902] bg-[#FDC902]/[0.14] text-[#FDC902]'
                }`}
              >
                {copy.allCategories}
                <span className={md.faint}>{total}</span>
              </Link>
            </li>
            {CATALOG_CATEGORIES.filter((c) => (counts[c.slug] ?? 0) > 0).map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${locale}/catalog/${categoryUrlSlug(c.slug)}`}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] ${mdFocus} ${
                    active === c.slug ? 'border-[#FDC902] bg-[#FDC902]/[0.14] text-[#FDC902]' : `${md.line} ${md.card} text-white/80`
                  }`}
                >
                  {names[c.slug]}
                  <span className={md.faint}>{counts[c.slug]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className={`mt-8 text-xs uppercase tracking-[0.06em] ${md.faint}`}>{copy.parts(items.length)}</p>

        {items.length === 0 ? (
          <p className={`mt-4 rounded-[18px] ${md.card} p-6 text-sm ${md.muted}`}>{copy.empty}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const text = localizedText(item, locale);
              const image = itemImageUrls(item, 1)[0];
              const fits = itemFitLabels(item, 3);
              const category = names[item.category] ?? item.categoryLabel;
              return (
                <li key={item.id} className="min-w-0">
                  <article>
                    <Link href={`/${locale}/shop/${item.id}`} className={`group flex min-w-0 flex-col rounded-[18px] ${mdFocus}`}>
                      <div className={`relative aspect-square overflow-hidden rounded-[18px] ${md.card}`}>
                        {image && (
                          <ProductImage
                            src={image}
                            alt={[item.brand, text.name, category].filter(Boolean).join(' — ')}
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
        )}
      </main>
    </div>
  );
}
