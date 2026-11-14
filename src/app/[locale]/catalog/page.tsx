import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { CatalogDirectory } from '@/components/seo/CatalogDirectory';
import { JsonLd, breadcrumbLd, itemListLd } from '@/lib/seo/jsonld';
import { CATALOG_COPY, seoCategory } from '@/lib/seo/categories';
import { carModels } from '@/lib/seo/cars';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';
import { localizedText, type CatalogCategory } from '@/domain/catalog';
import { itemImageUrls, listAllPublishedItems } from '@/server/catalog-seo';

// Rebuilt at most every 10 minutes, so a newly uploaded part shows up here (and gets crawled) quickly.
export const revalidate = 600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { title, description } = CATALOG_COPY[l];
  return buildMetadata({ locale: l, path: '/catalog', title, description });
}

export default async function CatalogPage({ params }: Props) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  setRequestLocale(l);
  const items = await listAllPublishedItems();
  const counts: Partial<Record<CatalogCategory, number>> = {};
  for (const i of items) counts[seoCategory(i)] = (counts[seoCategory(i)] ?? 0) + 1;
  const copy = CATALOG_COPY[l];

  return (
    <>
      <JsonLd
        data={[
          itemListLd({
            locale: l,
            path: '/catalog',
            name: copy.h1,
            description: copy.description,
            items: items.map((i) => ({ id: i.id, name: localizedText(i, l).name, image: itemImageUrls(i, 1)[0] })),
          }),
          breadcrumbLd([
            { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
            { name: SEO_COPY[l].breadcrumbShop, path: localePath(l, '/catalog') },
          ]),
        ]}
      />
      <CatalogDirectory locale={l} items={items} counts={counts} active={null} cars={carModels(items)} />
    </>
  );
}
