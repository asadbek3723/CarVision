'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useAuth } from '@/features/auth/context/AuthContext';
import { StudioLock } from '@/features/seller/components/StudioLock';
import { LeadDetail, type SellerLeadOrder } from '@/features/seller/components/LeadDetail';

export default function SellerOrderDetailPage() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const orderId = params?.['orderId'] as string;
  const { user, isLoading } = useAuth();
  const unlocked = user?.role === 'b2b_seller' && user.plan?.isPaid === true;

  const [order, setOrder] = React.useState<SellerLeadOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!unlocked) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/seller/orders?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success && d.order) setOrder(d.order);
        else setError('Buyurtma topilmadi');
      })
      .catch(() => !cancelled && setError('Yuklab bo‘lmadi'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId, unlocked]);

  const redeem = async (o: SellerLeadOrder): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/seller/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: o.id, status: 'completed' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return data.error || 'Qabul qilib bo‘lmadi';
      setOrder(data.order);
      return null;
    } catch {
      return 'Tarmoq xatosi. Qayta urinib ko‘ring';
    }
  };

  const shell = (children: React.ReactNode) => (
    <VeloceShell>
      <div className="mx-auto max-w-xl px-4 pb-32 pt-4 md:px-8">{children}</div>
    </VeloceShell>
  );

  if (isLoading || loading) return shell(<div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" /></div>);
  if (!user) return shell(<div className="mt-10 text-center"><Link href={`/${locale}/login`} className="inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-sm font-bold text-black">Kirish</Link></div>);
  if (!unlocked) return shell(<StudioLock title="Buyurtmalar" />);

  return shell(
    <>
      <div className="mb-5 flex items-center gap-3">
        <Link href={`/${locale}/seller?tab=dashboard`} aria-label="Orqaga" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/80 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-lg font-bold text-white">Buyurtma</h1>
      </div>
      {order ? <LeadDetail order={order} onRedeem={redeem} /> : <p role="alert" className="rounded-3xl bg-white/[0.04] px-5 py-10 text-center text-sm text-white/60">{error ?? 'Buyurtma topilmadi'}</p>}
    </>
  );
}
