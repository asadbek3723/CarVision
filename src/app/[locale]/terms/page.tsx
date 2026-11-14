import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { getLegal, legalDescription } from '@/content/legal';
import { JsonLd, breadcrumbLd } from '@/lib/seo/jsonld';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/lib/seo/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { doc } = getLegal('terms', l);
  return buildMetadata({ locale: l, path: '/terms', title: `${doc.title} | CarVision`, description: legalDescription(doc) });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  setRequestLocale(l);
  const { doc, ui, lang } = getLegal('terms', l);
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: SEO_COPY[l].breadcrumbHome, path: localePath(l) },
          { name: doc.title, path: localePath(l, '/terms') },
        ])}
      />
      <LegalDocument locale={l} doc={doc} ui={ui} kind="terms" lang={lang} />
    </>
  );
}
