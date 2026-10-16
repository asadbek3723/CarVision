import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
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
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#0A0B0F] text-white min-h-screen antialiased select-none">
        <NextIntlClientProvider messages={messages}>
          {children}
          <PwaInstallPrompt />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
