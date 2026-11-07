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
import type { CatalogItemDTO } from '@/domain/catalog';
import { StudioLock } from './StudioLock';

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
  const [items, setItems] = React.useState<CatalogItemDTO[]>([]);
  const [leads, setLeads] = React.useState<SellerLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const isSeller = user?.plan?.isPaid === true;

  const load = React.useCallback(async () => {
    setLoading(true);
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
  }, [t, apiError]);

  React.useEffect(() => {
    if (isSeller) void load();
    else if (!authLoading) setLoading(false);
  }, [isSeller, authLoading, load]);

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
        <Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" />
      </div>
    );
  }

  if (user && !isSeller) return <StudioLock feature="dashboard" />;

  if (!user) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-6 text-center">
        <p className="text-sm text-white/80">{t('studioOnly')}</p>
        <Link href={`/${locale}/login`} className="mt-4 inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-sm font-bold text-black">
          {t('login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-4 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-white/50">{t('studio')}</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">{user.shop?.shop_name ?? t('defaultName')}</h1>
        </div>
        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <div className="flex h-12 items-center gap-2.5 rounded-full border border-[#D4AE62]/30 bg-gradient-to-b from-[#D4AE62]/[0.14] to-[#D4AE62]/[0.04] ps-2 pe-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#D4AE62]/20 text-[#D4AE62]">
              <Coins className="h-4 w-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#D4AE62]/90">{t('credits')}</span>
              <span className="mt-1 text-base font-bold tabular-nums text-white">{user.role === 'super_admin' ? '∞' : user.credits_balance}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={openCamera}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.09] active:scale-[0.98] sm:flex-none"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">{t('takePhoto')}</span>
          </button>
          <Link
            href={`/${locale}/seller/new-part`}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-b from-[#E2BF78] to-[#C79F4E] px-6 text-sm font-bold text-black shadow-[0_6px_20px_-6px_rgba(212,174,98,0.55)] transition hover:brightness-105 active:scale-[0.98] sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            {t('addProduct')}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t('statPublished'), value: published.length, icon: Package },
          { label: t('statDraft'), value: items.length - published.length, icon: EyeOff },
          { label: t('statOut'), value: lowStock, icon: Sparkles },
          { label: t('statOrders'), value: leads.length, icon: Users },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-[#0B0D13] p-4">
            <s.icon className="h-4 w-4 text-[#D4AE62]" />
            <p className="mt-2 text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="shrink-0 text-xs font-semibold underline">{t('reload')}</button>
        </p>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        {(
          [
            ['parts', t('tabParts', { count: items.length })],
            ['leads', t('tabLeads', { count: leads.length })],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${tab === key ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'parts' && (
        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
              <p className="text-sm text-white/70">{t('emptyParts')}</p>
              <Link href={`/${locale}/seller/new-part`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D4AE62] px-5 py-3 text-xs font-bold text-black">
                <Plus className="h-4 w-4" />
                {t('addProduct')}
              </Link>
            </div>
          )}
          {items.map((item) => (
            <article key={item.id} className="flex flex-col gap-4 rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-4 sm:flex-row sm:items-center">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-black sm:w-32">
                {item.coverImageUrl && (
                  <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-white">{item.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === 'PUBLISHED' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
                    {item.status === 'PUBLISHED' ? t('statusPublished') : t('statusDraft')}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/50">
                  {tCat(item.category)}
                  {item.brand ? ` · ${item.brand}` : ''}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/40">
                  {item.isUniversal ? t('allCars') : item.fitment.map((f) => f.label).slice(0, 3).join(', ')}
                  {!item.isUniversal && item.fitment.length > 3 ? ` +${item.fitment.length - 3}` : ''}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#D4AE62]">
                  {item.inputPrice !== null
                    ? `${new Intl.NumberFormat(intlLocale).format(item.inputPrice)} ${item.inputCurrency}`
                    : formatPrice(item.priceUSD, 'USD')}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <div className="flex items-center gap-2">
                  <button type="button" aria-label={t('decrease')} onClick={() => void setStock(item, item.stock - 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className={`w-10 text-center text-sm font-bold ${item.stock === 0 ? 'text-red-300' : 'text-white'}`}>{item.stock}</span>
                  <button type="button" aria-label={t('increase')} onClick={() => void setStock(item, item.stock + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/${locale}/seller/new-part?id=${item.id}`} aria-label={t('edit')} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button type="button" disabled={busyId === item.id} aria-label={item.status === 'PUBLISHED' ? t('hide') : t('publish')} onClick={() => void toggleStatus(item)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50">
                    {item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" disabled={busyId === item.id} aria-label={t('delete')} onClick={() => void remove(item)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-600 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'leads' && (
        <div className="mt-4 space-y-3">
          <Link href={`/${locale}/seller/redeem`} className="flex items-center justify-between rounded-3xl bg-[#D4AE62]/15 px-5 py-4 text-sm font-bold text-[#D4AE62] hover:bg-[#D4AE62]/25">
            {t('redeem')}
            <span aria-hidden>→</span>
          </Link>
          {leads.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm text-white/60">
              {t('emptyLeads')}
            </div>
          )}
          {leads.map((lead) => (
            <article key={lead.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-4">
              <Link href={`/${locale}/seller/orders/${lead.id}`} className="block min-w-0 hover:opacity-80">
                <p className="text-sm font-bold text-white">{lead.customerName}</p>
                <p className="text-xs text-white/50">{lead.partName}</p>
                <p className="mt-1 text-xs text-white/40">{t('code', { code: lead.voucherCode })}</p>
              </Link>
              <div className="text-end">
                <p className="text-sm font-semibold text-[#D4AE62]">{formatPrice(lead.totalPriceUSD, 'USD')}</p>
                <p className="text-[11px] text-white/45">{t('deposit', { amount: formatPrice(lead.depositUSD, 'USD') })}</p>
              </div>
              <a href={`tel:${lead.customerPhone}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15">
                <Phone className="h-3.5 w-3.5" />
                {t('call')}
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
