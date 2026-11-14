import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { CatalogDirectory } from '@/components/seo/CatalogDirectory';
import { JsonLd, breadcrumbLd, itemListLd } from '@/lib/seo/jsonld';
import { CATALOG_COPY, CATEGORY_NAMES, categoryFromUrlSlug, categoryUrlSlug } from '@/lib/seo/categories';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';
import { CATALOG_CATEGORIES, localizedText, type CatalogCategory } from '@/domain/catalog';
import { itemImageUrls, listAllPublishedItems } from '@/server/catalog-seo';

export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => CATALOG_CATEGORIES.map((c) => ({ locale, category: categoryUrlSlug(c.slug) })));
}

type Props = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const slug = categoryFromUrlSlug(category);
  if (!slug) return {};
  const name = CATEGORY_NAMES[l][slug];
  const count = (await listAllPublishedItems()).filter((i) => i.category === slug).length;
  return buildMetadata({
    locale: l,
    path: `/catalog/${category}`,
    title: CATALOG_COPY[l].categoryTitle(name),
    description: CATALOG_COPY[l].categoryDescription(name, count),
    // An empty category is a thin page: reachable, but kept out of the index until it has parts.
    noindex: count === 0,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const slug = categoryFromUrlSlug(category);
  if (!slug) notFound();
  setRequestLocale(l);
  const all = await listAllPublishedItems();
  const counts: Partial<Record<CatalogCategory, number>> = {};
  for (const i of all) counts[i.category] = (counts[i.category] ?? 0) + 1;
  const items = all.filter((i) => i.category === slug);
  const name = CATEGORY_NAMES[l][slug];

  return (
    <>
      <JsonLd
        data={[
          itemListLd({
            locale: l,
            path: `/catalog/${category}`,
            name,
            description: CATALOG_COPY[l].categoryDescription(name, items.length),
            items: items.map((i) => ({ id: i.id, name: localizedText(i, l).name, image: itemImageUrls(i, 1)[0] })),
          }),
          breadcrumbLd([
            { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
            { name: SEO_COPY[l].breadcrumbShop, path: localePath(l, '/catalog') },
            { name, path: localePath(l, `/catalog/${category}`) },
          ]),
        ]}
      />
      <CatalogDirectory locale={l} items={items} counts={counts} active={slug} />
    </>
  );
}
