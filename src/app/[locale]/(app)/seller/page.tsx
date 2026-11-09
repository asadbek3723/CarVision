'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VeloceHome } from '@/components/veloce/VeloceHome';
import { VeloceGarage } from '@/components/veloce/VeloceGarage';
import { SellerDashboardView } from '@/features/seller/components/SellerDashboardView';

/** The tab is read on the client, so this page is prebuilt and opens instantly from the dock. */
function SellerTabs() {
  const tab = useSearchParams()?.get('tab');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  // Old links (?tab=garage / ?tab=dashboard) move to the screens' own paths.
  React.useEffect(() => {
    if (tab === 'garage' || tab === 'dashboard') router.replace(`/${locale}/${tab}`);
  }, [tab, locale, router]);
  if (tab === 'garage') return <VeloceGarage />;
  if (tab === 'dashboard') return <SellerDashboardView />;
  return <VeloceHome />;
}

export default function SellerPage() {
  return (
    <React.Suspense fallback={<VeloceHome />}>
      <SellerTabs />
    </React.Suspense>
  );
}
