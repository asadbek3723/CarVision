import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { VeloceStoreProvider } from '@/context/VeloceStore';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { JsonLd, organizationLd, websiteLd } from '@/lib/seo/jsonld';
import { SEO_COPY } from '@/lib/seo/copy';
import { DEFAULT_LOCALE, SITE_NAME, SITE_URL, isLocale } from '@/lib/seo/site';
import { Cinzel, Cormorant_Garamond, JetBrains_Mono, Manrope, Montserrat, Noto_Sans_Arabic, Outfit, Plus_Jakarta_Sans } from 'next/font/google';

const fOutfit = Outfit({ subsets: ['latin', 'latin-ext'], weight: ['300', '400', '500', '600', '700', '800', '900'], display: 'swap', variable: '--nf-outfit' });
const fJakarta = Plus_Jakarta_Sans({ subsets: ['latin', 'latin-ext', 'cyrillic-ext'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--nf-jakarta', preload: false });
const fMono = JetBrains_Mono({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--nf-mono', preload: false });
const fCinzel = Cinzel({ subsets: ['latin', 'latin-ext'], weight: ['600', '700', '800'], display: 'swap', variable: '--nf-cinzel', preload: false });
const fCormorant = Cormorant_Garamond({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['500', '600', '700'], display: 'swap', variable: '--nf-cormorant' });
const fManrope = Manrope({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['300', '400', '500', '600', '700'], display: 'swap', variable: '--nf-manrope' });
const fMontserrat = Montserrat({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['200', '300', '400', '500', '600', '700'], display: 'swap', variable: '--nf-montserrat' });
const fArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--nf-noto-arabic', preload: false });
const FONT_VARS = [fOutfit, fJakarta, fMono, fCinzel, fCormorant, fManrope, fMontserrat, fArabic].map((f) => f.variable).join(' ');
import '../../../styles/globals.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const copy = SEO_COPY[l];
  const verification: NonNullable<Metadata['verification']> = {};
  const google = process.env['NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION'];
  const yandex = process.env['NEXT_PUBLIC_YANDEX_VERIFICATION'];
  const bing = process.env['NEXT_PUBLIC_BING_VERIFICATION'];
  if (google) verification.google = google;
  if (yandex) verification.yandex = yandex;
  if (bing) verification.other = { 'msvalidate.01': bing };

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: copy.home.title,
    description: copy.home.description,
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
    },
    appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: SITE_NAME },
    formatDetection: { telephone: false },
    verification,
  };
}

export const viewport: Viewport = {
  themeColor: '#12141A',
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={`dark ${FONT_VARS}`} suppressHydrationWarning>
      <head>
      </head>
      <body className="bg-[#0A0B0F] text-white min-h-screen antialiased select-none" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CurrencyProvider>
              <VeloceStoreProvider>
                <JsonLd data={[organizationLd(), websiteLd(locale as Locale)]} />
                {children}
                <PwaInstallPrompt />
              </VeloceStoreProvider>
            </CurrencyProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
