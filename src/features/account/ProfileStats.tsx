'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PageHeader } from '@/components/ui';
import { pageWrap } from '@/features/account/preferences';
import { isSellerUser } from '@/features/auth/roles';

interface LedgerEntry {
  amount: number;
  at: string;
}
interface BookingLite {
  status: 'AWAITING_PAYMENT' | 'PENDING_ADMIN_APPROVAL' | 'UNLOCKED' | 'REDEEMED' | 'REJECTED' | 'CANCELLED';
  totalUSD: number;
}
interface Inventory {
  totalCount: number;
  inStockCount: number;
  items: Array<{ status: string }>;
}
interface Orders {
  count: number;
  totalPayoutUSD: number;
  orders: Array<{ status: string }>;
}

const DAY = 24 * 60 * 60 * 1000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? (data as T) : null;
  } catch {
    return null;
  }
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-3xl font-semibold tabular-nums tracking-[-0.02em] text-white md:text-5xl">{value}</p>
      <p className="mt-1.5 truncate text-xs text-white/50 md:text-sm">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/35 md:text-xs">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 py-8 md:py-12 lg:grid-cols-[minmax(220px,320px)_1fr] lg:gap-16">
      <h2 className="font-heading text-base font-semibold text-white md:text-lg">{title}</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 xl:grid-cols-4 md:gap-x-10">{children}</div>
    </section>
  );
}

/** Every number about the account in one place: credits and renders, bookings, and (paid studios) catalog and orders. */
export function ProfileStats() {
  const t = useTranslations('statsPage');
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const studio = isSellerUser(user);

  const [loading, setLoading] = React.useState(true);
  const [ledger, setLedger] = React.useState<LedgerEntry[]>([]);
  const [bookings, setBookings] = React.useState<BookingLite[]>([]);
  const [inventory, setInventory] = React.useState<Inventory | null>(null);
  const [orders, setOrders] = React.useState<Orders | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [history, bookingData, inv, ord] = await Promise.all([
        getJson<{ entries: LedgerEntry[] }>('/api/v1/credits/history'),
        getJson<{ bookings: BookingLite[] }>('/api/v1/bookings'),
        studio ? getJson<Inventory>('/api/v1/seller/inventory') : Promise.resolve(null),
        studio ? getJson<Orders>('/api/v1/seller/orders') : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setLedger(history?.entries ?? []);
      setBookings(bookingData?.bookings ?? []);
      setInventory(inv);
      setOrders(ord);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, studio]);

  if (!user) return null;

  const n = (v: number) => v.toLocaleString(locale);
  const now = Date.now();
  const spent = ledger.filter((e) => e.amount < 0);
  const credits = user.credits_balance >= 1_000_000 ? '∞' : n(user.credits_balance);
  const renders30 = spent.filter((e) => now - new Date(e.at).getTime() < 30 * DAY).length;
  const creditsSpent = spent.reduce((s, e) => s + Math.abs(e.amount), 0);
  const creditsIn = ledger.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);

  const byStatus = (st: BookingLite['status'][]) => bookings.filter((b) => st.includes(b.status)).length;
  const unlocked = bookings.filter((b) => b.status === 'UNLOCKED' || b.status === 'REDEEMED');
  const unlockedValue = unlocked.reduce((s, b) => s + (Number(b.totalUSD) || 0), 0);

  return (
    <div className={pageWrap}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} back={{ href: `/${locale}/profile` }} />

      {loading ? (
        <div className="flex justify-center py-20" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
        </div>
      ) : (
        <>
          <Section title={t('creditsTitle')}>
            <Tile label={t('balance')} value={credits} />
            <Tile label={t('renders')} value={n(spent.length)} hint={t('last30', { count: renders30 })} />
            <Tile label={t('spent')} value={n(creditsSpent)} />
            <Tile label={t('received')} value={n(creditsIn)} />
          </Section>

          <Section title={t('bookingsTitle')}>
            <Tile label={t('bookingsAll')} value={n(bookings.length)} />
            <Tile label={t('bookingsWaiting')} value={n(byStatus(['AWAITING_PAYMENT', 'PENDING_ADMIN_APPROVAL']))} />
            <Tile label={t('bookingsUnlocked')} value={n(byStatus(['UNLOCKED']))} />
            <Tile label={t('bookingsDone')} value={n(byStatus(['REDEEMED']))} />
            <Tile label={t('bookingsCancelled')} value={n(byStatus(['REJECTED', 'CANCELLED']))} />
            <Tile label={t('bookingsValue')} value={formatPrice(unlockedValue)} />
          </Section>

          {studio && (inventory || orders) && (
            <Section title={t('studioTitle')}>
              {inventory && (
                <>
                  <Tile label={t('products')} value={n(inventory.totalCount)} />
                  <Tile label={t('inStock')} value={n(inventory.inStockCount)} />
                  <Tile label={t('drafts')} value={n(inventory.items.filter((i) => i.status === 'DRAFT').length)} />
                </>
              )}
              {orders && (
                <>
                  <Tile label={t('orders')} value={n(orders.count)} />
                  <Tile label={t('ordersDone')} value={n(orders.orders.filter((o) => o.status === 'completed').length)} />
                  <Tile label={t('deposits')} value={formatPrice(orders.totalPayoutUSD ?? 0)} />
                </>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
