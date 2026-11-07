'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useAuth } from '@/features/auth/context/AuthContext';
import { StudioLock } from '@/features/seller/components/StudioLock';
import { LeadDetail, formatDate, type SellerLeadOrder } from '@/features/seller/components/LeadDetail';
import { readJson } from '@/lib/safe-json';

/** Voucher terminal: the customer shows a code, the workshop looks it up and accepts it. */
export default function SellerRedeemVoucherPage() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, isLoading } = useAuth();
  const unlocked = user?.role === 'b2b_seller' && user.plan?.isPaid === true;

  const [code, setCode] = React.useState('');
  const [recent, setRecent] = React.useState<SellerLeadOrder[]>([]);
  const [loadingRecent, setLoadingRecent] = React.useState(true);
  const [match, setMatch] = React.useState<SellerLeadOrder | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadRecent = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/seller/orders', { cache: 'no-store' });
      const data = (await readJson(res)).data;
      if (res.ok && data.success) setRecent(data.orders ?? []);
    } catch {
      // list is optional
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  React.useEffect(() => {
    if (unlocked) void loadRecent();
    else setLoadingRecent(false);
  }, [unlocked, loadRecent]);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (value.length < 3) return setError('Kodni kiriting');
    setSearching(true);
    setError(null);
    setMatch(null);
    try {
      const res = await fetch('/api/v1/seller/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: value, action: 'lookup' }) });
      const data = (await readJson(res)).data;
      if (!res.ok || !data.success || !data.order) throw new Error(data.error || 'Vaucher topilmadi');
      setMatch(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSearching(false);
    }
  };

  const redeem = async (order: SellerLeadOrder): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/seller/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: order.voucherCode, action: 'redeem' }) });
      const data = (await readJson(res)).data;
      if (!res.ok || !data.success) return data.error || 'Qabul qilib bo‘lmadi';
      setMatch(data.order);
      setRecent((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
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

  if (isLoading) return shell(<div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" /></div>);
  if (!user) return shell(<div className="mt-10 text-center"><Link href={`/${locale}/login`} className="inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-sm font-bold text-black">Kirish</Link></div>);
  if (!unlocked) return shell(<StudioLock title="Vaucher terminali" />);

  const pending = recent.filter((o) => o.status === 'verified');
  const finished = recent.filter((o) => o.status === 'completed');

  return shell(
    <>
      <div className="mb-5 flex items-center gap-3">
        <Link href={`/${locale}/seller?tab=dashboard`} aria-label="Orqaga" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/80 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-lg font-bold text-white">Vaucher qabul qilish</h1>
      </div>

      <form onSubmit={lookup} className="rounded-3xl bg-white/[0.04] p-5">
        <label htmlFor="code" className="mb-2 block text-xs font-semibold text-white/55">Mijoz ko‘rsatgan kod</label>
        <div className="flex gap-2">
          <input
            id="code"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            placeholder="123-456 yoki CV-A1B2C3"
            autoComplete="off"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-2xl bg-white/[0.07] px-4 py-3.5 font-mono text-lg tracking-wider text-white outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-white/30 focus:bg-white/[0.1]"
          />
          <button type="submit" disabled={searching} className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#D4AE62] px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline">Tekshirish</span>
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </form>

      {match && <div className="mt-5"><LeadDetail order={match} onRedeem={redeem} /></div>}

      {!match && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold text-white">Qabul qilishni kutayotganlar {pending.length > 0 && <span className="text-[#D4AE62]">({pending.length})</span>}</h2>
          {loadingRecent ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#D4AE62]" /></div>
          ) : pending.length === 0 ? (
            <p className="rounded-3xl bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">Hozircha zakalat to‘lagan mijoz yo‘q.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => { setMatch(o); setCode(o.voucherCode); }} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3.5 text-start transition hover:bg-white/[0.08]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{o.customerName}</span>
                      <span className="block text-xs text-white/45">#{o.orderNumber} · {formatDate(o.appointmentDate)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold text-[#D4AE62]">{o.voucherCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {finished.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-sm font-bold text-white/70">Qabul qilinganlar</h2>
              <ul className="space-y-2">
                {finished.slice(0, 10).map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => setMatch(o)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-start opacity-80 hover:opacity-100">
                      <span className="truncate text-sm text-white/80">{o.customerName}</span>
                      <span className="shrink-0 text-xs text-white/40">#{o.orderNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
