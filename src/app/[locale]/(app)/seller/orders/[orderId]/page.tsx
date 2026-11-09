'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SellerOnly } from '@/features/seller/components/SellerOnly';
import { isSellerUser } from '@/features/auth/roles';
import { LeadDetail, type SellerLeadOrder } from '@/features/seller/components/LeadDetail';
import { buttonClasses } from '@/components/ui';

export default function SellerOrderDetailPage() {
  const t = useTranslations('sellerOrders');
  const apiError = useApiError();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const orderId = params?.['orderId'] as string;
  const { user, isLoading } = useAuth();
  const unlocked = isSellerUser(user);

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
        else setError(t('orderNotFound'));
      })
      .catch(() => !cancelled && setError(t('errLoad')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId, unlocked, t]);

  const redeem = async (o: SellerLeadOrder): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/seller/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: o.id, status: 'completed' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return apiError(data, t('errAccept'));
      setOrder(data.order);
      return null;
    } catch {
      return t('errNetwork');
    }
  };

  const shell = (children: React.ReactNode) => (
    <>
      <div className="mx-auto max-w-xl px-4 pb-6 pt-4 md:px-8">{children}</div>
    </>
  );

  if (isLoading || loading) return shell(<div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-gold-500" /></div>);
  if (!user) return shell(<div className={buttonClasses({ size: 'sm', className: 'mt-10' })}><Link href={`/${locale}/login`} className="inline-block rounded-full bg-gold-500 px-6 py-2.5 text-sm font-bold text-black">{t('login')}</Link></div>);
  if (!unlocked) return <SellerOnly />;

  return shell(
    <>
      <div className="mb-5 flex items-center gap-3">
        <Link href={`/${locale}/dashboard`} aria-label={t('back')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/80 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{t('orderTitle')}</h1>
      </div>
      {order ? <LeadDetail order={order} onRedeem={redeem} /> : <p role="alert" className="rounded-3xl bg-white/[0.04] px-5 py-10 text-center text-sm text-white/60">{error ?? t('orderNotFound')}</p>}
    </>
  );
}
