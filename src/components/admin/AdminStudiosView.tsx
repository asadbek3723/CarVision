'use client';

import * as React from 'react';
import { Search, CheckCircle2, Ban, CreditCard, X, Tablet } from 'lucide-react';

interface Studio {
  id: string;
  name: string;
  city: string;
  district: string;
  phone: string;
  plan: 'FREE' | 'PRO' | 'MAX';
  devicesCount: number;
  maxDevices: number;
  rendersCount: number;
  maxRenders: number;
  balanceCents: number;
  status: 'active' | 'blocked';
  joinedDate: string;
}

const INITIAL_STUDIOS: Studio[] = [
  {
    id: 'st-01',
    name: 'Apex Customs Studio',
    city: 'Toshkent',
    district: 'Yunusobod',
    phone: '+998 90 123 45 67',
    plan: 'MAX',
    devicesCount: 7,
    maxDevices: 8,
    rendersCount: 3240,
    maxRenders: 4000,
    balanceCents: 45000,
    status: 'active',
    joinedDate: '12-yanvar, 2026',
  },
  {
    id: 'st-02',
    name: 'Autotune Pro Tashkent',
    city: 'Toshkent',
    district: 'Chilonzor',
    phone: '+998 97 765 43 21',
    plan: 'PRO',
    devicesCount: 3,
    maxDevices: 3,
    rendersCount: 680,
    maxRenders: 800,
    balanceCents: 12000,
    status: 'active',
    joinedDate: '18-yanvar, 2026',
  },
  {
    id: 'st-03',
    name: 'Dubai Custom Wheels',
    city: 'Toshkent',
    district: 'Mirzo Ulug‘bek',
    phone: '+998 99 888 77 66',
    plan: 'MAX',
    devicesCount: 8,
    maxDevices: 8,
    rendersCount: 3920,
    maxRenders: 4000,
    balanceCents: 98000,
    status: 'active',
    joinedDate: '03-fevral, 2026',
  },
  {
    id: 'st-04',
    name: 'Samarkand Tuning Lab',
    city: 'Samarqand',
    district: 'Registon',
    phone: '+998 93 456 78 90',
    plan: 'PRO',
    devicesCount: 2,
    maxDevices: 3,
    rendersCount: 540,
    maxRenders: 800,
    balanceCents: 8500,
    status: 'active',
    joinedDate: '10-fevral, 2026',
  },
  {
    id: 'st-05',
    name: 'Fergana Tuning Studio',
    city: 'Farg‘ona',
    district: 'Markaz',
    phone: '+998 91 234 56 78',
    plan: 'FREE',
    devicesCount: 1,
    maxDevices: 1,
    rendersCount: 38,
    maxRenders: 40,
    balanceCents: 0,
    status: 'active',
    joinedDate: '24-fevral, 2026',
  },
  {
    id: 'st-06',
    name: 'Buxoro Auto Custom',
    city: 'Buxoro',
    district: 'G‘ijduvon',
    phone: '+998 94 345 67 89',
    plan: 'PRO',
    devicesCount: 3,
    maxDevices: 3,
    rendersCount: 710,
    maxRenders: 800,
    balanceCents: 15400,
    status: 'active',
    joinedDate: '01-mart, 2026',
  },
  {
    id: 'st-07',
    name: 'Namangan Motors',
    city: 'Namangan',
    district: 'Kosonsoy',
    phone: '+998 90 987 65 43',
    plan: 'PRO',
    devicesCount: 1,
    maxDevices: 3,
    rendersCount: 490,
    maxRenders: 800,
    balanceCents: 4200,
    status: 'blocked',
    joinedDate: '15-mart, 2026',
  },
];

export function AdminStudiosView() {
  const [studios, setStudios] = React.useState<Studio[]>(INITIAL_STUDIOS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [planFilter, setPlanFilter] = React.useState<'ALL' | 'FREE' | 'PRO' | 'MAX'>('ALL');
  const [editingStudio, setEditingStudio] = React.useState<Studio | null>(null);

  // Edit Plan Modal Form State
  const [modalPlan, setModalPlan] = React.useState<'FREE' | 'PRO' | 'MAX'>('PRO');
  const [modalCredits, setModalCredits] = React.useState('800');
  const [modalPrice, setModalPrice] = React.useState('29');
  const [modalNotes, setModalNotes] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const filteredStudios = studios.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.phone.includes(searchQuery);
    const matchesPlan = planFilter === 'ALL' || st.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const toggleStudioStatus = (id: string) => {
    setStudios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === 'active' ? 'blocked' : 'active' } : s))
    );
  };

  const openPlanModal = (studio: Studio) => {
    setEditingStudio(studio);
    setModalPlan(studio.plan);
    setModalCredits(studio.plan === 'MAX' ? '4000' : studio.plan === 'PRO' ? '800' : '40');
    setModalPrice(studio.plan === 'MAX' ? '99' : studio.plan === 'PRO' ? '29' : '0');
    setModalNotes(`Admin manual assignment for ${studio.name}`);
    setSaveSuccess(false);
  };

  const handlePlanSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudio) return;

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    setStudios((prev) =>
      prev.map((s) =>
        s.id === editingStudio.id
          ? {
              ...s,
              plan: modalPlan,
              maxRenders: parseInt(modalCredits, 10),
              maxDevices: modalPlan === 'MAX' ? 8 : modalPlan === 'PRO' ? 3 : 1,
            }
          : s
      )
    );

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingStudio(null);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            Hamkor Atelyelar va Servislar
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            O‘zbekiston hududidagi barcha B2B servislar, ularning obunalari va qurilma kvotalari
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidirish (Nomi, shahar, tel)..."
              className="w-full h-10 ps-10 pe-4 rounded-xl bg-[#0D0F15] border border-[#D4AE62]/20 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AE62] focus:ring-1 focus:ring-[#D4AE62]/40"
            />
          </div>

          {/* Plan Filter Badges */}
          <div className="flex items-center p-1 rounded-xl bg-[#0D0F15] border border-[#D4AE62]/15">
            {(['ALL', 'FREE', 'PRO', 'MAX'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPlanFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  planFilter === tab
                    ? 'bg-gradient-to-r from-[#D4AE62] to-[#E5C378] text-black shadow-[0_2px_10px_rgba(212,174,98,0.3)]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl bg-[#0D0F15] shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-[#D4AE62]/10 bg-[#12141C] text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                <th className="py-4 px-6 text-start">Atelye Nomi</th>
                <th className="py-4 px-4 text-start">Shahar & Tuman</th>
                <th className="py-4 px-4 text-start">Joriy Tarif</th>
                <th className="py-4 px-4 text-start">Qurilmalar</th>
                <th className="py-4 px-4 text-start">4K Render Quvvati</th>
                <th className="py-4 px-4 text-start">Holat</th>
                <th className="py-4 px-6 text-end">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AE62]/5 text-xs">
              {filteredStudios.map((st) => (
                <tr
                  key={st.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Name & Phone */}
                  <td className="py-4 px-6">
                    <div>
                      <span className="font-bold text-white group-hover:text-[#D4AE62] transition-colors block text-sm">
                        {st.name}
                      </span>
                      <span className="font-mono text-[11px] text-[#94A3B8] mt-0.5 block">
                        {st.phone}
                      </span>
                    </div>
                  </td>

                  {/* City */}
                  <td className="py-4 px-4 text-[#CBD5E1]">
                    <span>{st.city}</span>
                    <span className="text-[11px] text-[#64748B] block">{st.district}</span>
                  </td>

                  {/* Plan Badge */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                        st.plan === 'MAX'
                          ? 'bg-gradient-to-r from-[#D4AE62]/25 to-[#F3DE9D]/20 text-[#E5C378] border border-[#D4AE62]/40 shadow-[0_0_12px_rgba(212,174,98,0.2)]'
                          : st.plan === 'PRO'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-white/10 text-white/80 border border-white/10'
                      }`}
                    >
                      {st.plan} {st.plan === 'MAX' ? '($99)' : st.plan === 'PRO' ? '($29)' : '($0)'}
                    </span>
                  </td>

                  {/* Devices */}
                  <td className="py-4 px-4 font-mono">
                    <div className="flex items-center gap-1.5 text-white">
                      <Tablet className="w-3.5 h-3.5 text-[#D4AE62]" />
                      <span className="font-bold">{st.devicesCount}</span>
                      <span className="text-[#64748B]">/ {st.maxDevices} ta</span>
                    </div>
                  </td>

                  {/* Renders Progress */}
                  <td className="py-4 px-4">
                    <div className="space-y-1.5 w-36">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-white font-semibold">{st.rendersCount}</span>
                        <span className="text-[#64748B]">/ {st.maxRenders}</span>
                      </div>
                      <div className="w-full bg-[#1C1F2B] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#D4AE62] to-[#F3DE9D] h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (st.rendersCount / st.maxRenders) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        st.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          st.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                        }`}
                      />
                      {st.status === 'active' ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openPlanModal(st)}
                        className="px-3 py-1.5 rounded-xl bg-[#141722] hover:bg-[#1E2333] text-[#D4AE62] hover:text-[#E5C378] text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Tarif</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStudioStatus(st.id)}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          st.status === 'active'
                            ? 'text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={st.status === 'active' ? 'Bloklash' : 'Faollashtirish'}
                      >
                        {st.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudios.length === 0 && (
          <div className="p-12 text-center text-xs text-[#94A3B8]">
            Hech qanday atelye topilmadi. Qidiruv so‘zini o‘zgartirib ko‘ring.
          </div>
        )}
      </div>

      {/* Plan Assignment Modal */}
      {editingStudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#0B0C10] border border-[#D4AE62]/30 p-6 sm:p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(212,174,98,0.1)] relative">
            <button
              onClick={() => setEditingStudio(null)}
              className="absolute top-5 end-5 p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[#D4AE62]/15">
              <div className="w-10 h-10 rounded-xl bg-[#141722] flex items-center justify-center text-[#D4AE62]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tarif va Quvvat Tayinlash</h3>
                <p className="text-xs text-[#D4AE62] font-medium">{editingStudio.name}</p>
              </div>
            </div>

            <form onSubmit={handlePlanSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  Obuna Tarifi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FREE', 'PRO', 'MAX'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setModalPlan(p);
                        if (p === 'MAX') {
                          setModalCredits('4000');
                          setModalPrice('99');
                        } else if (p === 'PRO') {
                          setModalCredits('800');
                          setModalPrice('29');
                        } else {
                          setModalCredits('40');
                          setModalPrice('0');
                        }
                      }}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                        modalPlan === p
                          ? 'bg-gradient-to-r from-[#D4AE62] to-[#E5C378] text-black shadow-[0_2px_12px_rgba(212,174,98,0.3)]'
                          : 'bg-[#12141C] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {p}
                      <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                        {p === 'MAX' ? '$99' : p === 'PRO' ? '$29' : '$0'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    Kreditlar Soni
                  </label>
                  <input
                    type="number"
                    value={modalCredits}
                    onChange={(e) => setModalCredits(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#12141C] border border-[#232733] text-sm text-white font-mono focus:outline-none focus:border-[#D4AE62]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    To‘lov Miqdori ($)
                  </label>
                  <input
                    type="number"
                    value={modalPrice}
                    onChange={(e) => setModalPrice(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#12141C] border border-[#232733] text-sm text-white font-mono focus:outline-none focus:border-[#D4AE62]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  Admin Izohi (Audit uchun)
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Karta/naqd to'lov orqali tasdiqlandi..."
                  className="w-full h-11 px-3.5 rounded-xl bg-[#12141C] border border-[#232733] text-xs text-white focus:outline-none focus:border-[#D4AE62]"
                />
              </div>

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Tarif muvaffaqiyatli saqlandi! Atelye tizimiga yangilandi.
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#D4AE62] via-[#E5C378] to-[#D4AE62] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(212,174,98,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saqlanmoqda...' : 'Tarifni Yangilash & Tasdiqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
