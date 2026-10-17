'use client';

import * as React from 'react';
import { DollarSign, Store, Sparkles, ShieldCheck, TrendingUp, Cpu, Activity, Clock } from 'lucide-react';

export function AdminOverviewView() {
  const [metrics, setMetrics] = React.useState({
    totalRevenueFormatted: '$48.9k',
    sellersCount: 8,
    productsCount: 36,
    generationsCount: 18450,
    escrowDepositFormatted: '$8.4k',
    activeOrdersCount: 4,
  });

  React.useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/v1/admin/overview');
        const data = await res.json();
        if (isMounted && data.success && data.metrics) {
          setMetrics(data.metrics);
        }
      } catch {
        // keep defaults
      }
    };
    fetchMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = [
    {
      title: 'Jami Tushum',
      value: metrics.totalRevenueFormatted,
      change: '+18.4%',
      period: 'o‘tgan oyga nisbatan',
      icon: DollarSign,
      glow: 'shadow-[0_8px_24px_-6px_rgba(212,174,98,0.25)]',
    },
    {
      title: 'Hamkor Atelyelar',
      value: String(metrics.sellersCount),
      change: `+${metrics.sellersCount} ta`,
      period: 'Supabase tasdiqlangan',
      icon: Store,
      glow: 'shadow-[0_8px_24px_-6px_rgba(59,130,246,0.25)]',
    },
    {
      title: '4K AI Renderlar',
      value: metrics.generationsCount.toLocaleString(),
      change: '+420 ta',
      period: 'bugun amalga oshirildi',
      icon: Sparkles,
      glow: 'shadow-[0_8px_24px_-6px_rgba(168,85,247,0.25)]',
    },
    {
      title: '3% Zakalat Depozitlari',
      value: metrics.escrowDepositFormatted,
      change: `${metrics.activeOrdersCount} ta`,
      period: 'faol kafolatli buyurtma',
      icon: ShieldCheck,
      glow: 'shadow-[0_8px_24px_-6px_rgba(16,185,129,0.25)]',
    },
  ];

  const weeklyData = [
    { day: 'Dsh', amount: 4800, renders: 2100, height: '55%' },
    { day: 'Ssh', amount: 6200, renders: 2600, height: '70%' },
    { day: 'Chsh', amount: 5400, renders: 2350, height: '62%' },
    { day: 'Pay', amount: 7900, renders: 3100, height: '85%' },
    { day: 'Jum', amount: 9200, renders: 3900, height: '100%' },
    { day: 'Shb', amount: 8400, renders: 3400, height: '90%' },
    { day: 'Yak', amount: 6900, renders: 2800, height: '75%' },
  ];

  const recentActivity = [
    {
      id: 'act-1',
      studio: 'Apex Customs Studio',
      action: 'Chevrolet Malibu 2 uchun 20" Forged disklar 4K renderini yakunladi',
      time: '2 daqiqa oldin',
      tag: '4K Render',
      tagColor: 'text-[#D4AE62] bg-[#D4AE62]/10',
    },
    {
      id: 'act-2',
      studio: 'Autotune Pro Toshkent',
      action: 'Buyurtma #CV-9821 uchun $72 zakalat depoziti qabul qilindi',
      time: '14 daqiqa oldin',
      tag: '3% Zakalat',
      tagColor: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      id: 'act-3',
      studio: 'Dubai Custom Wheels',
      action: 'MAX tarifiga yangilandi (8 ta qurilma, 4,000 ta kadr)',
      time: '45 daqiqa oldin',
      tag: 'Obuna',
      tagColor: 'text-sky-400 bg-sky-500/10',
    },
    {
      id: 'act-4',
      studio: 'Samarkand Tuning Lab',
      action: 'Yangi iPad Pro 12.9" plansheti kassa tizimiga ulandi',
      time: '1 soat oldin',
      tag: 'Qurilma',
      tagColor: 'text-purple-400 bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-7">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`rounded-2xl bg-[#0D0F15] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 relative overflow-hidden transition-all duration-200 hover:-translate-y-1 ${kpi.glow}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#94A3B8]">{kpi.title}</span>
                <div className="w-9 h-9 rounded-xl bg-[#141722] flex items-center justify-center text-[#D4AE62]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">
                  {kpi.value}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 me-1" />
                  {kpi.change}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-[#64748B]">{kpi.period}</p>
            </div>
          );
        })}
      </div>

      {/* Main Analytics Section: Chart & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0D0F15] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AE62]/10">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Haftalik Tushum & AI Quvvati Dinamikasi
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  So‘nggi 7 kundagi obunalar va 4K renderlar soni
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#D4AE62] to-[#F3DE9D]" />
                  Tushum ($)
                </span>
                <span className="flex items-center gap-1.5 text-[#94A3B8]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  Renderlar
                </span>
              </div>
            </div>

            {/* Custom Bar Visualization */}
            <div className="mt-8 flex items-end justify-between gap-3 h-52 px-2">
              {weeklyData.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                  <div className="text-[10px] font-mono text-[#D4AE62] opacity-0 group-hover:opacity-100 transition-opacity">
                    ${(item.amount / 1000).toFixed(1)}k
                  </div>
                  <div className="w-full max-w-[42px] bg-[#141722] rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 relative h-full">
                    <div
                      className="w-full bg-gradient-to-t from-[#B88E3E] via-[#D4AE62] to-[#F3DE9D] rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-[0_0_12px_rgba(212,174,98,0.3)]"
                      style={{ height: item.height }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#94A3B8] group-hover:text-white transition-colors">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#D4AE62]/10 flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              O‘rtacha kunlik o‘sish: +14.2%
            </span>
            <span className="font-mono text-white font-bold">Jami haftalik: $48,920</span>
          </div>
        </div>

        {/* Real-time Infrastructure Status */}
        <div className="rounded-2xl bg-[#0D0F15] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AE62]/10">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#D4AE62]" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Tizim & GPU Klasteri
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                99.98% SLA
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-[#12141C] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Fal.ai FLUX Fill Klasteri
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">1.38s</span>
                </div>
                <div className="w-full bg-[#1C1F2B] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[42%]" />
                </div>
                <div className="flex justify-between text-[10px] text-[#64748B]">
                  <span>8x A100 Tugunlari</span>
                  <span>42% Yuklama</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#12141C] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AE62]" />
                    3% Zakalat Escrow Hamyoni
                  </span>
                  <span className="font-mono text-white font-bold">$8,420</span>
                </div>
                <div className="w-full bg-[#1C1F2B] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#D4AE62] to-[#F3DE9D] h-full w-[88%]" />
                </div>
                <div className="flex justify-between text-[10px] text-[#64748B]">
                  <span>Click / Payme / Uzum</span>
                  <span>100% Himoyalangan</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#12141C] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-sky-400" />
                    B2B Multi-Device Kvotasi
                  </span>
                  <span className="font-mono text-sky-400 font-bold">312 / 500</span>
                </div>
                <div className="w-full bg-[#1C1F2B] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-500 to-blue-400 h-full w-[62%]" />
                </div>
                <div className="flex justify-between text-[10px] text-[#64748B]">
                  <span>Faol planshet va telefonlar</span>
                  <span>62% Ishlatilmoqda</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#D4AE62]/10 text-center">
            <span className="text-[11px] text-[#94A3B8]">
              Server hududi: <span className="text-white font-semibold">Toshkent (TAS-IX / Cloud)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Live Atelier Activity Stream */}
      <div className="rounded-2xl bg-[#0D0F15] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15">
        <div className="flex items-center justify-between pb-4 border-b border-[#D4AE62]/10">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Atelyelar Jonli Faoliyati
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              O‘zbekiston bo‘ylab tuning salonlarining real vaqtdagi harakatlari
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs text-[#D4AE62] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#D4AE62] animate-ping" />
            Jonli efir
          </span>
        </div>

        <div className="mt-4 divide-y divide-[#D4AE62]/5">
          {recentActivity.map((act) => (
            <div
              key={act.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${act.tagColor}`}>
                  {act.tag}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">{act.studio}</h4>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{act.action}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-[#64748B] shrink-0 font-medium">
                <Clock className="w-3 h-3" />
                <span>{act.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
