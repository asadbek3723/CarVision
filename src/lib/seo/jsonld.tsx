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
  /** Category shown to people, e.g. "Disklar". */
  category?: string;
  /** Car models the part is listed for. */
  fits?: string[];
  universal?: boolean;
}): Json {
  const url = absoluteUrl(localePath(p.locale, `/shop/${p.id}`));
  // A year ahead: Google wants an end date on prices; sellers change them in the dashboard anyway.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: p.description,
    url,
    sku: p.id,
    inLanguage: p.locale,
    ...(p.category ? { category: p.category } : {}),
    ...(p.images.length
      ? {
          image: p.images.map((src, i) => ({
            '@type': 'ImageObject',
            url: src,
            contentUrl: src,
            name: i === 0 ? p.name : `${p.name} — ${i + 1}`,
            caption: [p.brand, p.name, p.category].filter(Boolean).join(' · '),
            representativeOfPage: i === 0,
          })),
        }
      : {}),
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    ...(p.fits?.length
      ? { isAccessoryOrSparePartFor: p.fits.map((name) => ({ '@type': 'Car', name })) }
      : {}),
    ...(p.universal
      ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'fitment', value: 'universal' }] }
      : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: p.priceUSD.toFixed(2),
      priceCurrency: 'USD',
      priceValidUntil,
      itemCondition: 'https://schema.org/NewCondition',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };
}

/** A listing page (catalog / category): its parts as an ordered list of product links. */
export function itemListLd(p: {
  locale: Locale;
  path: string;
  name: string;
  description: string;
  items: Array<{ id: string; name: string; image?: string | undefined }>;
}): Json {
  const url = absoluteUrl(localePath(p.locale, p.path));
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#page`,
    name: p.name,
    description: p.description,
    url,
    inLanguage: p.locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: p.items.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: p.items.map((it, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: absoluteUrl(localePath(p.locale, `/shop/${it.id}`)),
        name: it.name,
        ...(it.image ? { image: it.image } : {}),
      })),
    },
  };
}
