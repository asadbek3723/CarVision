import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { CatalogDirectory } from '@/components/seo/CatalogDirectory';
import { JsonLd, breadcrumbLd, itemListLd } from '@/lib/seo/jsonld';
import { CARS_COPY, carModels } from '@/lib/seo/cars';
import { seoCategory } from '@/lib/seo/categories';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';
import { localizedText, type CatalogCategory } from '@/domain/catalog';
import { itemImageUrls, listAllPublishedItems } from '@/server/catalog-seo';

export const revalidate = 600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const copy = CARS_COPY[l];
  const models = carModels(await listAllPublishedItems());
  return buildMetadata({ locale: l, path: '/cars', title: copy.indexTitle, description: copy.indexDescription, noindex: models.length === 0 });
}

/** Every car model some part is listed for, with all parts that are listed for a model. */
export default async function CarsPage({ params }: Props) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  setRequestLocale(l);
  const all = await listAllPublishedItems();
  const models = carModels(all);
  const items = all.filter((i) => i.fitment.length > 0);
  const counts: Partial<Record<CatalogCategory, number>> = {};
  for (const i of items) counts[seoCategory(i)] = (counts[seoCategory(i)] ?? 0) + 1;
  const copy = CARS_COPY[l];

  return (
    <>
      <JsonLd
        data={[
          itemListLd({
            locale: l,
            path: '/cars',
            name: copy.indexH1,
            description: copy.indexDescription,
            items: items.map((i) => ({ id: i.id, name: localizedText(i, l).name, image: itemImageUrls(i, 1)[0] })),
          }),
          breadcrumbLd([
            { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
            { name: copy.byCar, path: localePath(l, '/cars') },
          ]),
        ]}
      />
      <CatalogDirectory
        locale={l}
        items={items}
        counts={counts}
        active={null}
        heading={copy.indexH1}
        intro={copy.indexIntro}
        crumbs={[{ name: copy.byCar }]}
        cars={models}
      />
    </>
  );
}
