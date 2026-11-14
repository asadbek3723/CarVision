import { BRAND_VARIANTS, SEO_COPY } from './copy';
import { brandNotInName } from './categories';
import { SITE_NAME, SITE_URL, absoluteUrl, localePath } from './site';
import { socialLinks, supportEmail } from './social';
import type { Locale } from '@/i18n/routing';

type Json = Record<string, unknown>;

/** Server component: renders one JSON-LD block. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
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
    ...(supportEmail()
      ? { email: supportEmail(), contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: supportEmail(), availableLanguage: ['uz', 'ru', 'en'] } }
      : {}),
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

/**
 * The workshop plans as one product with an offer per plan, so search engines can show the prices.
 * `plans` comes from the database (the same list the page shows).
 */
export function plansLd(
  locale: Locale,
  plans: Array<{ code: string; name: string; priceUSD: number; credits: number; durationDays: number }>,
  copy: { name: string; description: string; credits: (n: number) => string }
): Json | null {
  if (plans.length === 0) return null;
  const url = absoluteUrl(localePath(locale, '/plans'));
  const prices = plans.map((p) => p.priceUSD);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#plans`,
    name: copy.name,
    description: copy.description,
    url,
    inLanguage: locale,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: plans.length,
      offers: plans.map((p) => ({
        '@type': 'Offer',
        name: p.name,
        description: copy.credits(p.credits),
        sku: p.code,
        price: p.priceUSD.toFixed(2),
        priceCurrency: 'USD',
        url,
        availability: 'https://schema.org/InStock',
        ...(p.durationDays > 0 ? { eligibleDuration: { '@type': 'QuantitativeValue', value: p.durationDays, unitCode: 'DAY' } } : {}),
        seller: { '@id': `${SITE_URL}/#organization` },
      })),
    },
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
            caption: [brandNotInName(p.brand, p.name), p.name, p.category].filter(Boolean).join(' · '),
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
