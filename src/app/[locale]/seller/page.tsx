import { VeloceShell } from '@/components/veloce/VeloceShell';
import { VeloceHome } from '@/components/veloce/VeloceHome';
import { VeloceGarage } from '@/components/veloce/VeloceGarage';

export default async function SellerPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const isGarage = resolvedParams?.tab === 'garage';

  return (
    <VeloceShell>
      {isGarage ? <VeloceGarage /> : <VeloceHome />}
    </VeloceShell>
  );
}
