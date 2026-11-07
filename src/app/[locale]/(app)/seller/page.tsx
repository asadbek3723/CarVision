'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { VeloceHome } from '@/components/veloce/VeloceHome';
import { VeloceGarage } from '@/components/veloce/VeloceGarage';
import { SellerDashboardView } from '@/features/seller/components/SellerDashboardView';

/** The tab is read on the client, so this page is prebuilt and opens instantly from the dock. */
function SellerTabs() {
  const tab = useSearchParams()?.get('tab');
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
