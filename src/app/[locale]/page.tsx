import type { Metadata } from 'next';
import GoldenLandingPage from '@/components/landing/GoldenLandingPage';
import { getTranslations } from 'next-intl/server';
import { JsonLd, faqLd, softwareApplicationLd } from '@/lib/seo/jsonld';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { title, description } = SEO_COPY[l].home;
  return buildMetadata({ locale: l, path: '', title, description, image: `/${l}/opengraph-image` });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale: l, namespace: 'landing.faq' });
  const faq = (['1', '2', '3', '4'] as const).map((n) => ({ q: t(`q${n}`), a: t(`a${n}`) }));
  return (
    <>
      <JsonLd data={[softwareApplicationLd(l), faqLd(faq)]} />
      <GoldenLandingPage />
    </>
  );
}
