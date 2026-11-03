import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { OG_LOCALE, SITE_NAME, absoluteUrl, languageAlternates, localePath } from './site';
import { locales } from '@/i18n/routing';

interface BuildMetadataInput {
  locale: Locale;
  /** Path without locale, e.g. '' | '/shop' | '/shop/abc'. */
  path?: string;
  title: string;
  description: string;
  /** Absolute or site-relative image URL. Defaults to the locale's generated opengraph-image. */
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  ogType?: 'website' | 'article';
}

/** Single source of truth for page metadata: canonical, hreflang, Open Graph, Twitter, robots. */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { locale, path = '', title, description, noindex = false, ogType = 'website' } = input;
  const url = absoluteUrl(localePath(locale, path));
  const image = input.image
    ? input.image.startsWith('http')
      ? input.image
      : absoluteUrl(input.image)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: input.imageAlt ?? title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
        },
  };
}

/** Metadata for private/utility routes. Keeps them out of the index. */
export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
