import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { VeloceStoreProvider } from '@/context/VeloceStore';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { TouchGuard } from '@/components/pwa/TouchGuard';
import { LaunchSplash } from '@/components/pwa/LaunchSplash';
import { JsonLd, organizationLd, websiteLd } from '@/lib/seo/jsonld';
import { SEO_COPY } from '@/lib/seo/copy';
import { DEFAULT_LOCALE, SITE_NAME, SITE_URL, isLocale } from '@/lib/seo/site';
import { JetBrains_Mono, Montserrat, Noto_Sans_Arabic, Outfit, Plus_Jakarta_Sans } from 'next/font/google';

// Only fonts the UI really uses (Outfit = body/headings, Montserrat = display). Cormorant, Cinzel and
// Manrope were never referenced by any class, yet two of them were preloaded on every page.
// `weight: 'variable'` ships one file per font instead of one per weight.
const fOutfit = Outfit({ subsets: ['latin', 'latin-ext'], weight: 'variable', display: 'swap', variable: '--nf-outfit' });
const fMontserrat = Montserrat({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: 'variable', display: 'swap', variable: '--nf-montserrat' });
const fJakarta = Plus_Jakarta_Sans({ subsets: ['latin', 'latin-ext', 'cyrillic-ext'], weight: 'variable', display: 'swap', variable: '--nf-jakarta', preload: false });
const fMono = JetBrains_Mono({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: 'variable', display: 'swap', variable: '--nf-mono', preload: false });
const fArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: 'variable', display: 'swap', variable: '--nf-noto-arabic', preload: false });
const FONT_VARS = [fOutfit, fMontserrat, fJakarta, fMono, fArabic].map((f) => f.variable).join(' ');
import '../../../styles/globals.css';

/** Every locale's pages are built ahead of time and served from the CDN instead of rendering per request. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
        { url: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png?v=2', sizes: '180x180' }],
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
  // App-like: no pinch zoom (Android honours this; iOS is handled by <TouchGuard />).
  maximumScale: 1,
  userScalable: false,
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

  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={`dark ${FONT_VARS}`} suppressHydrationWarning>
      <head>
        {/* Catch the one-time install event before React hydrates (it is easy to miss otherwise). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__cvDeferredPrompt=e;window.dispatchEvent(new Event('cv:installable'));});",
          }}
        />
      </head>
      <body className="bg-surface-0 text-white min-h-screen antialiased select-none" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CurrencyProvider>
              <VeloceStoreProvider>
                <JsonLd data={[organizationLd(), websiteLd(locale as Locale)]} />
                {children}
                <PwaInstallPrompt />
                <TouchGuard />
                <LaunchSplash />
              </VeloceStoreProvider>
            </CurrencyProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
