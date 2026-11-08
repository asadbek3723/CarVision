'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Camera, Coins, Eye, EyeOff, Loader2, Minus, Package, Pencil, Phone, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { cachedInventory, rememberInventory } from '@/features/seller/lib/inventory-cache';
import { ProductImage } from '@/components/ui/ProductImage';
import type { CatalogItemDTO } from '@/domain/catalog';
import { SellerOnly } from './SellerOnly';
import { isSellerUser } from '@/features/auth/roles';
import { buttonClasses } from '@/components/ui';

interface SellerLead {
  id: string;
  voucherCode: string;
  customerName: string;
  customerPhone: string;
  partName: string;
  totalPriceUSD: number;
  depositUSD: number;
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  createdAt: string;
}

type Tab = 'parts' | 'leads';

async function patchItem(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/seller/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && Boolean(data.success);
  } catch {
    return false;
  }
}


export function SellerDashboardView() {
  const t = useTranslations('sellerDash');
  const apiError = useApiError();
  const tCat = useTranslations('catalogCat');
  const intlLocale = useLocale();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();
  const { openCamera } = useVeloceStore();
  const { user, isLoading: authLoading } = useAuth();

  const [tab, setTab] = React.useState<Tab>('parts');
  const [items, setItems] = React.useState<CatalogItemDTO[]>(() => cachedInventory(user?.id) ?? []);
  const [leads, setLeads] = React.useState<SellerLead[]>([]);
  const [loading, setLoading] = React.useState(() => !cachedInventory(user?.id));
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const isSeller = isSellerUser(user);

  const load = React.useCallback(async () => {
    // A list already on screen stays there while it refreshes; only a first visit shows the loader.
    if (!cachedInventory(user?.id)) setLoading(true);
    setError(null);
    try {
      const [invRes, ordRes] = await Promise.all([
        fetch('/api/v1/seller/inventory', { cache: 'no-store' }),
        fetch('/api/v1/seller/orders', { cache: 'no-store' }).catch(() => null),
      ]);
      const inv = await invRes.json().catch(() => ({}));
      if (!invRes.ok || !inv.success) throw new Error(apiError(inv, t('errLoad')));
      setItems(inv.items ?? []);
      const ord = ordRes && ordRes.ok ? await ordRes.json().catch(() => null) : null;
      setLeads(ord?.success && Array.isArray(ord.orders) ? ord.orders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errGeneric'));
    } finally {
      setLoading(false);
    }
  }, [t, apiError, user?.id]);

  React.useEffect(() => {
    if (isSeller) void load();
    else if (!authLoading) setLoading(false);
  }, [isSeller, authLoading, load]);

  // Edits made here (stock, status, delete) are what the garage shows next time too.
  React.useEffect(() => {
    if (!loading) rememberInventory(user?.id, items);
  }, [items, loading, user?.id]);

  const setStock = async (item: CatalogItemDTO, next: number) => {
    const stock = Math.max(0, next);
    const prev = item.stock;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, stock } : i)));
    if (!(await patchItem({ id: item.id, stock }))) {
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, stock: prev } : i)));
      setError(t('errStock'));
    }
  };

  const toggleStatus = async (item: CatalogItemDTO) => {
    const status = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyId(item.id);
    const ok = await patchItem({ id: item.id, status });
    if (ok) setItems((list) => list.map((i) => (i.id === item.id ? { ...i, status } : i)));
    else setError(t('errStatus'));
    setBusyId(null);
  };

  const remove = async (item: CatalogItemDTO) => {
    if (!window.confirm(t('confirmDelete', { name: item.name }))) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/v1/seller/inventory?productId=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error();
      setItems((list) => list.filter((i) => i.id !== item.id));
    } catch {
      setError(t('errDelete'));
    }
    setBusyId(null);
  };

  const published = items.filter((i) => i.status === 'PUBLISHED');
  const lowStock = published.filter((i) => i.stock === 0).length;

  if (authLoading || (loading && isSeller)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
      </div>
    );
  }

  if (user && !isSeller) return <SellerOnly />;

  if (!user) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl bg-surface-1 p-6 text-center">
        <p className="text-sm text-white/80">{t('studioOnly')}</p>
        <Link href={`/${locale}/login`} className={buttonClasses({ size: 'sm', className: 'mt-4' })}>
          {t('login')}
        </Link>
      </div>
    );
  }

  const credits = user.role === 'super_admin' ? '∞' : user.credits_balance.toLocaleString(intlLocale);
  const stats = [
    { label: t('statPublished'), value: published.length, icon: Package },
    { label: t('statDraft'), value: items.length - published.length, icon: EyeOff },
    { label: t('statOut'), value: lowStock, icon: Sparkles },
    { label: t('statOrders'), value: leads.length, icon: Users },
  ];
  const roundBtn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] hover:text-white active:scale-95 disabled:opacity-40';

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 pb-32 pt-4 md:px-10 md:pt-10 lg:px-16">
      {/* Header */}
      <header className="md:flex md:items-end md:justify-between md:gap-8">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-500 md:text-xs">{t('studio')}</p>
          <h1 className="mt-1.5 truncate font-heading text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-4xl">
            {user.shop?.shop_name ?? t('defaultName')}
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-white/50">
            <Coins className="h-4 w-4 text-gold-500" />
            <span className="font-semibold tabular-nums text-white">{credits}</span>
            <span>{t('credits').toLowerCase()}</span>
          </p>
        </div>
        <div className="mt-5 flex items-center gap-2.5 md:mt-0 md:shrink-0">
          <button
            type="button"
            onClick={openCamera}
            aria-label={t('takePhoto')}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white/[0.06] text-sm font-semibold text-white transition hover:bg-white/[0.1] active:scale-[0.98] md:w-auto md:px-5"
          >
            <Camera className="h-[18px] w-[18px] text-gold-500" />
            <span className="hidden md:inline">{t('takePhoto')}</span>
          </button>
          <Link
            href={`/${locale}/seller/new-part`}
            className={buttonClasses({ size: 'md', className: 'h-12 min-w-0 flex-1 !rounded-full px-6 md:flex-none' })}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('addProduct')}</span>
          </Link>
        </div>
      </header>

      {/* Stats: one quiet row */}
      <dl className="mt-8 grid grid-cols-4 md:mt-12">
        {stats.map((s, i) => (
          <div key={s.label} className={`min-w-0 ${i > 0 ? 'border-s border-white/10 ps-3 md:ps-8' : 'pe-3'}`}>
            <s.icon aria-hidden="true" className="h-4 w-4 text-gold-500 md:h-5 md:w-5" />
            <dd className="mt-2 font-display text-2xl font-semibold tabular-nums leading-none text-white md:text-4xl">{s.value}</dd>
            <dt className="mt-1.5 truncate text-[11px] text-white/50 md:text-sm">{s.label}</dt>
          </div>
        ))}
      </dl>

      {error && (
        <p role="alert" className="mt-6 flex items-center justify-between gap-3 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="shrink-0 text-xs font-semibold underline">{t('reload')}</button>
        </p>
      )}

      {/* Tabs: text with a gold underline */}
      <div role="tablist" className="mt-10 flex gap-7 md:mt-14">
        {(
          [
            ['parts', t('tabParts', { count: items.length })],
            ['leads', t('tabLeads', { count: leads.length })],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`relative pb-2.5 text-sm font-semibold transition md:text-base ${tab === key ? 'text-white' : 'text-white/45 hover:text-white/75'}`}
          >
            {label}
            <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-gold-500 transition-opacity ${tab === key ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        ))}
      </div>

      {tab === 'parts' && (
        <div className="mt-6 md:mt-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Package className="h-12 w-12 text-white/25" strokeWidth={1.4} />
              <p className="mt-4 max-w-sm text-sm text-white/60">{t('emptyParts')}</p>
              <Link href={`/${locale}/seller/new-part`} className={buttonClasses({ size: 'md', className: 'mt-5 !rounded-full px-6' })}>
                <Plus className="h-4 w-4" />
                {t('addProduct')}
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const isPublished = item.status === 'PUBLISHED';
                return (
                  <li key={item.id} className="flex min-w-0 flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-1">
                      {item.coverImageUrl && (
                        <ProductImage src={item.coverImageUrl} alt={item.name} sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw" className="object-cover" />
                      )}
                      <span className={`absolute start-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md ${isPublished ? 'bg-black/60 text-emerald-300' : 'bg-black/60 text-white/70'}`}>
                        {isPublished ? t('statusPublished') : t('statusDraft')}
                      </span>
                    </div>

                    <h3 className="mt-3 truncate text-sm font-semibold text-white md:text-base">{item.name}</h3>
                    <p className="mt-0.5 truncate text-[11px] text-white/45 md:text-xs">
                      {tCat(item.category)}
                      {item.brand ? ` · ${item.brand}` : ''}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold tabular-nums text-gold-500">
                      {item.inputPrice !== null
                        ? `${new Intl.NumberFormat(intlLocale).format(item.inputPrice)} ${item.inputCurrency}`
                        : formatPrice(item.priceUSD, 'USD')}
                    </p>

                    {/* Stock */}
                    <div className="mt-3 flex items-center justify-between">
                      <button type="button" aria-label={t('decrease')} onClick={() => void setStock(item, item.stock - 1)} className={roundBtn}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className={`text-base font-semibold tabular-nums ${item.stock === 0 ? 'text-red-300' : 'text-white'}`}>{item.stock}</span>
                      <button type="button" aria-label={t('increase')} onClick={() => void setStock(item, item.stock + 1)} className={roundBtn}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex items-center justify-between">
                      <Link href={`/${locale}/seller/new-part?id=${item.id}`} aria-label={t('edit')} className={roundBtn}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button type="button" disabled={busyId === item.id} aria-label={isPublished ? t('hide') : t('publish')} onClick={() => void toggleStatus(item)} className={roundBtn}>
                        {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" disabled={busyId === item.id} aria-label={t('delete')} onClick={() => void remove(item)} className={`${roundBtn} hover:!bg-red-500/20 hover:!text-red-300`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'leads' && (
        <div className="mt-6 md:mt-8">
          <Link href={`/${locale}/seller/redeem`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold-500 transition hover:text-gold-300">
            {t('redeem')}
            <span aria-hidden className="rtl:rotate-180">→</span>
          </Link>
          {leads.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Users className="h-12 w-12 text-white/25" strokeWidth={1.4} />
              <p className="mt-4 max-w-sm text-sm text-white/60">{t('emptyLeads')}</p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-x-12 lg:grid-cols-2">
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-center gap-4 py-4">
                  <Link href={`/${locale}/seller/orders/${lead.id}`} className="min-w-0 flex-1 hover:opacity-80">
                    <p className="truncate text-sm font-semibold text-white">{lead.customerName}</p>
                    <p className="truncate text-xs text-white/50">{lead.partName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-white/35">{t('code', { code: lead.voucherCode })}</p>
                  </Link>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-semibold tabular-nums text-gold-500">{formatPrice(lead.totalPriceUSD, 'USD')}</p>
                    <p className="text-[11px] text-white/40">{t('deposit', { amount: formatPrice(lead.depositUSD, 'USD') })}</p>
                  </div>
                  <a href={`tel:${lead.customerPhone}`} aria-label={t('call')} className={roundBtn}>
                    <Phone className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
