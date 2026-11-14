import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SEO_COPY } from '@/lib/seo/copy';
import { JsonLd, plansLd } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, isLocale } from '@/lib/seo/site';
import { listActivePlans, type PublicPlan } from '@/server/plans';

// Plans change rarely (admin panel): the prices in the structured data are refreshed every 10 minutes.
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { title, description } = SEO_COPY[l].plans;
  return buildMetadata({ locale: l, path: '/plans', title, description });
}

export default async function PlansLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  // Structured data is a bonus: a database hiccup must never break the page.
  const plans: PublicPlan[] = await listActivePlans().catch(() => []);
  const copy = SEO_COPY[l].plans;
  const ld = plansLd(l, plans, { name: copy.productName, description: copy.description, credits: copy.credits });
  return (
    <>
      {ld && <JsonLd data={ld} />}
      {children}
    </>
  );
}
