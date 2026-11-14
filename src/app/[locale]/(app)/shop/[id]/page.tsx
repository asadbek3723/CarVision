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
  const title = `${item.brand ? `${item.brand} ` : ''}${text.name} | CarVision`;
  const description = (
    text.description?.trim() || SEO_COPY[l].productDescription(text.name, item.brand, item.categoryLabel)
  ).slice(0, 160);
  return buildMetadata({
    locale: l,
    path: `/shop/${id}`,
    title,
    description,
    // The product image lives under the (app) route group, so Next picks its (hashed) URL itself.
    imageFromFile: true,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const item = await getPublishedItem(id);
  const text = item ? localizedText(item, l) : null;

  return (
    <>
      {item && (
        <JsonLd
          data={[
            productLd({
              locale: l,
              id,
              name: text?.name ?? item.name,
              brand: item.brand,
              description:
                text?.description?.trim() || SEO_COPY[l].productDescription(text?.name ?? item.name, item.brand, item.categoryLabel),
              images: item.images.map((i) => i.url).slice(0, 6),
              priceUSD: item.priceUSD,
              inStock: item.stock > 0,
            }),
            breadcrumbLd([
              { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
              { name: SEO_COPY[l].breadcrumbShop, path: localePath(l, '/shop') },
              { name: item.name, path: localePath(l, `/shop/${id}`) },
            ]),
          ]}
        />
      )}
      <VeloceProductDetail id={id} initialProduct={item ? (toVeloceProduct(item, l) as unknown as VeloceProduct) : null} />
    </>
  );
}
