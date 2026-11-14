import type { Metadata } from 'next';
import { VeloceProductDetail } from '@/components/veloce/VeloceProductDetail';
import { JsonLd, breadcrumbLd, productLd } from '@/lib/seo/jsonld';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';
import { getPublishedItem } from '@/server/catalog-public';
import { localizedText } from '@/domain/catalog';
import { toVeloceProduct } from '@/server/product-view';
import type { VeloceProduct } from '@/domain/veloce-catalog';
import { CATEGORY_NAMES, brandNotInName, categoryUrlSlug, seoCategory } from '@/lib/seo/categories';
import { itemFitLabels, itemImageUrls } from '@/server/catalog-seo';

// Product pages are built on first visit and then served from cache, refreshed at most once a minute,
// so opening a part does not wait for the database every time.
export const revalidate = 60;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const item = await getPublishedItem(id);
  if (!item) {
    return buildMetadata({
      locale: l,
      path: `/shop/${id}`,
      title: SEO_COPY[l].shop.title,
      description: SEO_COPY[l].shop.description,
      noindex: true,
    });
  }

  const text = localizedText(item, l);
  const brand = brandNotInName(item.brand, text.name);
  const category = CATEGORY_NAMES[l][seoCategory(item)] ?? item.categoryLabel;
  const title = `${brand ? `${brand} ` : ''}${text.name} | CarVision`;
  const description = (text.description?.trim() || SEO_COPY[l].productDescription(text.name, brand, category)).slice(0, 160);
  const fits = itemFitLabels(item, 8);
  return {
    ...buildMetadata({
      locale: l,
      path: `/shop/${id}`,
      title,
      description,
      // The product image lives under the (app) route group, so Next picks its (hashed) URL itself.
      imageFromFile: true,
    }),
    keywords: [text.name, item.brand, category, ...fits.map((f) => `${f} ${category}`), 'CarVision'].filter(Boolean),
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const item = await getPublishedItem(id);
  const text = item ? localizedText(item, l) : null;
  const name = text?.name ?? item?.name ?? '';
  const category = item ? (CATEGORY_NAMES[l][seoCategory(item)] ?? item.categoryLabel) : '';

  return (
    <>
      {item && (
        <JsonLd
          data={[
            productLd({
              locale: l,
              id,
              name,
              brand: item.brand,
              description: text?.description?.trim() || SEO_COPY[l].productDescription(name, brandNotInName(item.brand, name), category),
              images: itemImageUrls(item, 6),
              priceUSD: item.priceUSD,
              inStock: item.stock > 0,
              category,
              fits: itemFitLabels(item),
              universal: item.isUniversal,
            }),
            breadcrumbLd([
              { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
              { name: SEO_COPY[l].breadcrumbShop, path: localePath(l, '/catalog') },
              {
                name: category,
                path: localePath(l, `/catalog/${categoryUrlSlug(seoCategory(item))}`),
              },
              { name, path: localePath(l, `/shop/${id}`) },
            ]),
          ]}
        />
      )}
      <VeloceProductDetail id={id} initialProduct={item ? (toVeloceProduct(item, l) as unknown as VeloceProduct) : null} />
    </>
  );
}
