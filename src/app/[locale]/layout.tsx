import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { VeloceStoreProvider } from '@/context/VeloceStore';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import '../../../styles/globals.css';

export const metadata: Metadata = {
  title: 'CarVision — AI Automotive Tuning Visualizer',
  description: 'Visualize custom wheels, body kits, and detailing in 4K before physical installation.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CarVision',
  },
};

export const viewport: Viewport = {
  themeColor: '#12141A',
  width: 'device-width',
  initialScale: 1,
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

  const messages = await getMessages();
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Cormorant+Garamond:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700&family=Montserrat:wght@200;300;400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0A0B0F] text-white min-h-screen antialiased select-none" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CurrencyProvider>
              <VeloceStoreProvider>
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
