import type { Metadata } from 'next';
import { VeloceShop } from '@/components/veloce/VeloceShop';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { title, description } = SEO_COPY[l].shop;
  return buildMetadata({ locale: l, path: '/shop', title, description });
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return (
    <>
      {/* The page's one main heading for search engines and screen readers; the visible shop starts with its own tabs. */}
      <h1 className="sr-only">{SEO_COPY[l].shop.title}</h1>
      <VeloceShop />
    </>
  );
}
