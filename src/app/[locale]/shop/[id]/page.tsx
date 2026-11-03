import { VeloceShell } from '@/components/veloce/VeloceShell';
import { VeloceProductDetail } from '@/components/veloce/VeloceProductDetail';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <VeloceShell>
      <VeloceProductDetail id={id} />
    </VeloceShell>
  );
}
