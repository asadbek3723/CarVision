import { BRAND_VARIANTS, SEO_COPY } from './copy';
import { SITE_NAME, SITE_URL, absoluteUrl, localePath } from './site';
import type { Locale } from '@/i18n/routing';

type Json = Record<string, unknown>;

/** Server component: renders one JSON-LD block. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

function socialLinks(): string[] {
  return (process.env['NEXT_PUBLIC_SOCIAL_LINKS'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//.test(s));
}

export function organizationLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: BRAND_VARIANTS.filter((n) => n !== SITE_NAME),
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png'), width: 512, height: 512 },
    image: absoluteUrl('/icons/icon-512.png'),
    description: SEO_COPY.en.home.description,
    // Official profiles (Instagram, Telegram...), comma-separated in NEXT_PUBLIC_SOCIAL_LINKS: they tie the brand together for search engines.
    ...(socialLinks().length ? { sameAs: socialLinks() } : {}),
  };
}

export function websiteLd(locale: Locale): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: BRAND_VARIANTS.filter((n) => n !== SITE_NAME),
    description: SEO_COPY[locale].home.description,
    url: absoluteUrl(localePath(locale)),
    inLanguage: locale,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl(localePath(locale, '/shop'))}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function softwareApplicationLd(locale: Locale): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web, iOS, Android (PWA)',
    description: SEO_COPY[locale].home.description,
    url: absoluteUrl(localePath(locale)),
    inLanguage: locale,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function faqLd(items: Array<{ q: string; a: string }>): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function productLd(p: {
  locale: Locale;
  id: string;
  name: string;
  brand?: string;
  description: string;
  images: string[];
  priceUSD: number;
  inStock: boolean;
}): Json {
  const url = absoluteUrl(localePath(p.locale, `/shop/${p.id}`));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: p.description,
    url,
    ...(p.images.length ? { image: p.images } : {}),
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: p.priceUSD.toFixed(2),
      priceCurrency: 'USD',
      itemCondition: 'https://schema.org/NewCondition',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
}
