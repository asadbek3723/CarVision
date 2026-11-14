import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { OG_LOCALE, SITE_NAME, absoluteUrl, brandOgImagePath, languageAlternates, localePath } from './site';
import { SEO_COPY } from './copy';
import { locales } from '@/i18n/routing';

interface BuildMetadataInput {
  locale: Locale;
  /** Path without locale, e.g. '' | '/shop' | '/shop/abc'. */
  path?: string;
  title: string;
  description: string;
  /** Absolute or site-relative image URL. Defaults to the locale's brand link-preview image. */
  image?: string;
  imageAlt?: string;
  /**
   * Leave og:image / twitter:image to the route's own `opengraph-image` file. Use it under route groups such as
   * `(app)`: Next serves those images at a hashed path (`opengraph-image-<hash>`) that only it knows.
   */
  imageFromFile?: boolean;
  noindex?: boolean;
  ogType?: 'website' | 'article';
}

/** Single source of truth for page metadata: canonical, hreflang, Open Graph, Twitter, robots. */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { locale, path = '', title, description, noindex = false, ogType = 'website' } = input;
  const url = absoluteUrl(localePath(locale, path));
  const rawImage = input.image ?? brandOgImagePath(locale);
  const image = rawImage.startsWith('http') ? rawImage : absoluteUrl(rawImage);
  const imageAlt = input.imageAlt ?? (input.image ? title : `${SITE_NAME} — ${SEO_COPY[locale].tagline}`);
  const ogImages = input.imageFromFile ? {} : { images: [{ url: image, width: 1200, height: 630, alt: imageAlt, type: 'image/png' }] };
  const twitterImages = input.imageFromFile ? {} : { images: [{ url: image, width: 1200, height: 630, alt: imageAlt }] };

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
      ...ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...twitterImages,
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
