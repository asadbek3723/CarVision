import { VeloceShell } from '@/components/veloce/VeloceShell';
import { VeloceHome } from '@/components/veloce/VeloceHome';
import { VeloceGarage } from '@/components/veloce/VeloceGarage';
import { SellerDashboardView } from '@/features/seller/components/SellerDashboardView';

export default async function SellerPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const tab = resolvedParams?.tab;

  return (
    <VeloceShell>
      {tab === 'garage' ? (
        <VeloceGarage />
      ) : tab === 'dashboard' ? (
        <SellerDashboardView />
      ) : (
        <VeloceHome />
      )}
    </VeloceShell>
  );
}
