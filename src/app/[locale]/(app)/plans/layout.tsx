import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SEO_COPY } from '@/lib/seo/copy';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { title, description } = SEO_COPY[l].plans;
  return buildMetadata({ locale: l, path: '/plans', title, description });
}

export default function PlansLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
