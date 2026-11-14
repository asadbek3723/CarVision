import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { CatalogDirectory } from '@/components/seo/CatalogDirectory';
import { JsonLd, breadcrumbLd, itemListLd } from '@/lib/seo/jsonld';
import { CARS_COPY, carModels, partsForCar } from '@/lib/seo/cars';
import { categoryUrlSlug, seoCategory } from '@/lib/seo/categories';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';
import { localizedText, type CatalogCategory } from '@/domain/catalog';
import { itemImageUrls, listAllPublishedItems } from '@/server/catalog-seo';

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; model: string }> };

async function load(model: string) {
  const all = await listAllPublishedItems();
  const car = carModels(all).find((m) => m.slug === model) ?? null;
  return { all, car };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, model } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { car } = await load(model);
  if (!car) return {};
  const copy = CARS_COPY[l];
  return buildMetadata({ locale: l, path: `/cars/${car.slug}`, title: copy.carTitle(car.label), description: copy.carDescription(car.label, car.count) });
}

/** All parts listed for one car model ("Chevrolet Gentra uchun tyuning detallari"), universal parts below. */
export default async function CarPage({ params }: Props) {
  const { locale, model } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { all, car } = await load(model);
  if (!car) notFound();
  setRequestLocale(l);
  const { listed, universal } = partsForCar(all, car.slug);
  const counts: Partial<Record<CatalogCategory, number>> = {};
  for (const i of listed) counts[seoCategory(i)] = (counts[seoCategory(i)] ?? 0) + 1;
  const copy = CARS_COPY[l];

  return (
    <>
      <JsonLd
        data={[
          itemListLd({
            locale: l,
            path: `/cars/${car.slug}`,
            name: copy.carH1(car.label),
            description: copy.carDescription(car.label, listed.length),
            items: listed.map((i) => ({ id: i.id, name: localizedText(i, l).name, image: itemImageUrls(i, 1)[0] })),
          }),
          breadcrumbLd([
            { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
            { name: copy.byCar, path: localePath(l, '/cars') },
            { name: car.label, path: localePath(l, `/cars/${car.slug}`) },
          ]),
        ]}
      />
      <CatalogDirectory
        locale={l}
        items={listed}
        counts={counts}
        active={null}
        heading={copy.carH1(car.label)}
        intro={copy.carDescription(car.label, listed.length)}
        crumbs={[{ name: copy.byCar, href: `/${l}/cars` }, { name: car.label }]}
        allHref={`/${l}/cars/${car.slug}`}
        categoryHref={(slug) => `/${l}/cars/${car.slug}/${categoryUrlSlug(slug)}`}
        extra={{ heading: copy.universalHeading, items: universal }}
      />
    </>
  );
}
