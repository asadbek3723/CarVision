import type { Metadata } from 'next';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { VeloceShop } from '@/components/veloce/VeloceShop';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { title, description } = SEO_COPY[l].shop;
  return buildMetadata({ locale: l, path: '/shop', title, description, image: `/${l}/opengraph-image` });
}

export default function ShopPage() {
  return (
    <VeloceShell>
      <VeloceShop />
    </VeloceShell>
  );
}
