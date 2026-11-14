import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { CatalogDirectory } from '@/components/seo/CatalogDirectory';
import { JsonLd, breadcrumbLd, itemListLd } from '@/lib/seo/jsonld';
import { CARS_COPY, carModels, partsForCar } from '@/lib/seo/cars';
import { CATEGORY_NAMES, categoryFromUrlSlug, categoryUrlSlug, seoCategory } from '@/lib/seo/categories';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';
import { localizedText, type CatalogCategory } from '@/domain/catalog';
import { itemImageUrls, listAllPublishedItems } from '@/server/catalog-seo';

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; model: string; category: string }> };

async function load(model: string, category: string) {
  const slug = categoryFromUrlSlug(category);
  const all = await listAllPublishedItems();
  const car = carModels(all).find((m) => m.slug === model) ?? null;
  return { all, car, slug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, model, category } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { all, car, slug } = await load(model, category);
  if (!car || !slug) return {};
  const name = CATEGORY_NAMES[l][slug];
  const { listed } = partsForCar(all, car.slug, slug);
  const copy = CARS_COPY[l];
  return buildMetadata({
    locale: l,
    path: `/cars/${car.slug}/${category}`,
    title: copy.carCategoryTitle(name, car.label),
    description: copy.carCategoryDescription(name, car.label, listed.length),
    // Only parts listed for this model make the page worth indexing; universal ones alone do not.
    noindex: listed.length === 0,
  });
}

/** One catalog section for one car model: "Chevrolet Gentra uchun disklar". */
export default async function CarCategoryPage({ params }: Props) {
  const { locale, model, category } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { all, car, slug } = await load(model, category);
  if (!car || !slug) notFound();
  setRequestLocale(l);
  const { listed, universal } = partsForCar(all, car.slug, slug);
  const counts: Partial<Record<CatalogCategory, number>> = {};
  for (const i of partsForCar(all, car.slug).listed) counts[seoCategory(i)] = (counts[seoCategory(i)] ?? 0) + 1;
  const name = CATEGORY_NAMES[l][slug];
  const copy = CARS_COPY[l];
  const h1 = copy.carCategoryH1(name, car.label);

  return (
    <>
      <JsonLd
        data={[
          itemListLd({
            locale: l,
            path: `/cars/${car.slug}/${category}`,
            name: h1,
            description: copy.carCategoryDescription(name, car.label, listed.length),
            items: listed.map((i) => ({ id: i.id, name: localizedText(i, l).name, image: itemImageUrls(i, 1)[0] })),
          }),
          breadcrumbLd([
            { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
            { name: copy.byCar, path: localePath(l, '/cars') },
            { name: car.label, path: localePath(l, `/cars/${car.slug}`) },
            { name, path: localePath(l, `/cars/${car.slug}/${category}`) },
          ]),
        ]}
      />
      <CatalogDirectory
        locale={l}
        items={listed}
        counts={counts}
        active={slug}
        heading={h1}
        intro={copy.carCategoryDescription(name, car.label, listed.length)}
        crumbs={[{ name: copy.byCar, href: `/${l}/cars` }, { name: car.label, href: `/${l}/cars/${car.slug}` }, { name }]}
        allHref={`/${l}/cars/${car.slug}`}
        categoryHref={(s) => `/${l}/cars/${car.slug}/${categoryUrlSlug(s)}`}
        extra={{ heading: copy.universalHeading, items: universal }}
      />
    </>
  );
}
