'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useReveal } from './sections/shared';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Brands } from './sections/Brands';
import { VisualizerBeforeAfter } from './sections/VisualizerBeforeAfter';
import { HowItWorks } from './sections/HowItWorks';
import { TargetAudience } from './sections/TargetAudience';
import { Pricing } from './sections/Pricing';
import { Reviews } from './sections/Reviews';
import { MobileApp } from './sections/MobileApp';
import { Faq } from './sections/Faq';
import { CtaBanner } from './sections/CtaBanner';
import { Footer } from './sections/Footer';

export default function GoldenLandingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}/seller`);
      }
    }
  }, [user, locale, router]);

  useReveal();

  return (
    <main className="overflow-x-clip bg-background text-foreground">
      <Header locale={locale} />
      <Hero />
      <Brands />
      <VisualizerBeforeAfter />
      <HowItWorks />
      <TargetAudience locale={locale} />
      <Pricing locale={locale} />
      <Reviews />
      <MobileApp />
      <Faq />
      <CtaBanner locale={locale} />
      <Footer />
    </main>
  );
}
