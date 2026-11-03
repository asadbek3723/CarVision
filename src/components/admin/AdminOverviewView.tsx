'use client';

import { Banknote, Cpu, Package, ShieldCheck, Store, Users } from 'lucide-react';
import { BarChart, ErrorState, PageHeader, Pill, Spinner, StatTile, Surface, nf, timeAgo, useAdminData, usd } from './ui';
import { actionLabel } from './labels';
import type { AdminTab } from './AdminShell';

interface Overview {
  metrics: {
    users: number;
    sellers: number;
    shops: number;
    paidShops: number;
    freeShops: number;
    publishedItems: number;
    bookings: { pending: number; unlocked: number; redeemed: number };
    depositUSD: number;
    dealUSD: number;
    renders30d: { completed: number; failed: number; creditsUsed: number };
  };
  charts: { signups: Array<{ day: string; value: number }>; renders: Array<{ day: string; value: number }>; bookings: Array<{ day: string; value: number }> };
  recentAdminActions: Array<{ id: string; action: string; entity: string; admin: string; at: string }>;
}

export function AdminOverviewView({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const { data, error, loading, reload } = useAdminData<Overview>('/api/v1/admin/overview');

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const m = data.metrics;
  const rendersTotal = m.renders30d.completed + m.renders30d.failed;

  return (
    <div>
      <PageHeader title="Boshqaruv" subtitle="Platformaning real holati" />

      {m.bookings.pending > 0 && (
        <button type="button" onClick={() => onNavigate('escrow')} className="mb-5 flex w-full items-center justify-between gap-3 rounded-3xl bg-amber-500/15 px-5 py-4 text-start transition hover:bg-amber-500/20">
          <span className="text-sm font-semibold text-amber-200">{m.bookings.pending} ta zakalat cheki tasdiqlashni kutyapti</span>
          <span className="shrink-0 whitespace-nowrap text-xs font-bold text-amber-300">Ko‘rish →</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Foydalanuvchilar" value={nf.format(m.users)} hint={`${nf.format(m.sellers)} ta usta`} />
        <StatTile label="Ustaxonalar" value={nf.format(m.shops)} hint={`${m.paidShops} pullik · ${m.freeShops} free`} accent="gold" />
        <StatTile label="Do‘kondagi detallar" value={nf.format(m.publishedItems)} />
        <StatTile label="Tasdiqlangan zakalat" value={usd(m.depositUSD)} hint={`${usd(m.dealUSD)} umumiy bitim`} accent="green" />
        <StatTile label="Bronlar" value={`${m.bookings.unlocked + m.bookings.redeemed}`} hint={`${m.bookings.redeemed} yakunlangan`} />
        <StatTile label="AI renderlar (30 kun)" value={nf.format(m.renders30d.completed)} hint={rendersTotal ? `${Math.round((m.renders30d.completed / rendersTotal) * 100)}% muvaffaqiyatli` : 'hali yo‘q'} />
        <StatTile label="Xato renderlar" value={nf.format(m.renders30d.failed)} accent={m.renders30d.failed ? 'red' : undefined} hint="kredit qaytarilgan" />
        <StatTile label="Sarflangan kredit (30 kun)" value={nf.format(m.renders30d.creditsUsed)} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Surface className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Users className="h-4 w-4 text-[#D4AE62]" />Yangi foydalanuvchilar (7 kun)</h2>
          <BarChart points={data.charts.signups} label="Yangi foydalanuvchilar" />
        </Surface>
        <Surface className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Cpu className="h-4 w-4 text-[#D4AE62]" />AI renderlar (7 kun)</h2>
          <BarChart points={data.charts.renders} color="#7dd3fc" label="AI renderlar" />
        </Surface>
        <Surface className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Banknote className="h-4 w-4 text-[#D4AE62]" />Yangi bronlar (7 kun)</h2>
          <BarChart points={data.charts.bookings} color="#6ee7b7" label="Yangi bronlar" />
        </Surface>
      </div>

      <Surface className="mt-5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-[#D4AE62]" />So‘nggi admin amallari</h2>
          <button type="button" onClick={() => onNavigate('security')} className="text-xs font-semibold text-[#D4AE62] hover:underline">Hammasi</button>
        </div>
        {data.recentAdminActions.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/45">Hali amallar yo‘q.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentAdminActions.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{actionLabel(a.action)}</p>
                  <p className="truncate text-xs text-white/45">{a.admin}</p>
                </div>
                <Pill>{timeAgo(a.at)}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { tab: 'shops' as const, icon: Store, label: 'Ustaxonalar' },
          { tab: 'users' as const, icon: Users, label: 'Foydalanuvchilar' },
          { tab: 'escrow' as const, icon: Banknote, label: 'Zakalat' },
          { tab: 'renders' as const, icon: Package, label: 'AI renderlar' },
        ].map((q) => (
          <button key={q.tab} type="button" onClick={() => onNavigate(q.tab)} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
            <q.icon className="h-5 w-5 text-[#D4AE62]" />
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
