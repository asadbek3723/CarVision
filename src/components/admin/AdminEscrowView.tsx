'use client';

import * as React from 'react';
import { DollarSign, ShieldCheck, CheckCircle2, XCircle, Search, Clock, FileText, X, Check } from 'lucide-react';

interface EscrowOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  studioName: string;
  itemDescription: string;
  totalPriceCents: number;
  depositCents: number;
  paymentMethod: 'Click' | 'Payme' | 'Uzum' | 'Bank';
  transactionRef: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: string;
  receiptUrl?: string | null;
}

export function AdminEscrowView() {
  const [orders, setOrders] = React.useState<EscrowOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'ALL' | 'pending' | 'verified' | 'rejected'>('ALL');
  const [search, setSearch] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<EscrowOrder | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Fetch real orders from Supabase on mount
  React.useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/v1/admin/escrow');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to load escrow orders from Supabase:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filter === 'ALL' || o.status === filter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.studioName.toLowerCase().includes(search.toLowerCase()) ||
      o.transactionRef.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleUpdateStatus = async (id: string, newStatus: 'verified' | 'rejected') => {
    const target = orders.find((o) => o.id === id);
    const reason = newStatus === 'rejected' ? window.prompt('Rad etish sababi (mijozga ko‘rsatiladi):', 'Chek o‘qilmadi yoki summa mos emas') : undefined;
    if (newStatus === 'rejected' && reason === null) return;

    try {
      const res = await fetch('/api/v1/admin/escrow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, status: newStatus, reason: reason ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Saqlab bo‘lmadi');
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
      setToastMessage(
        newStatus === 'verified'
          ? `Bron #${target?.orderNumber} tasdiqlandi. Mijozga ustaxona manzili ochildi.`
          : `Bron #${target?.orderNumber} rad etildi.`
      );
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
    }
    setTimeout(() => setToastMessage(null), 3500);
    setSelectedOrder(null);
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const totalEscrowUsd = orders
    .filter((o) => o.status === 'verified')
    .reduce((acc, o) => acc + o.depositCents, 0) / 100;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Escrow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#0D0F15] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Tasdiqlangan Zakalat Balansi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              ${totalEscrowUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">100% depozit</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">Click, Payme va Uzum orqali kafolatlangan</p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Tekshiruv Kutilayotgan Cheklar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{pendingCount} ta</span>
            <span className="text-xs text-[#94A3B8]">kadr tasdiqlanishi kerak</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">Avtomatik OCR va admin nazorati</p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Platforma Xavfsizlik Kafolati</span>
            <div className="w-8 h-8 rounded-xl bg-[#D4AE62]/10 text-[#D4AE62] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">3.0%</span>
            <span className="text-xs text-[#D4AE62] font-semibold">Zakalat ulushi</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">O‘rnatish tugagunga qadar saqlanadi</p>
        </div>
      </div>

      {/* Table & Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">
            3% Zakalat Buyurtmalari Ro‘yxati
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Avtomobil egalari tomonidan atelyelarga yuborilgan rasmiy zakalat to‘lovlari
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buyurtma ID, mijoz yoki atelye..."
              className="w-full h-10 ps-10 pe-4 rounded-xl bg-[#0D0F15] border border-[#D4AE62]/20 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AE62]"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-[#0D0F15] border border-[#D4AE62]/15">
            {(['ALL', 'pending', 'verified', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-gradient-to-r from-[#D4AE62] to-[#E5C378] text-black shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab === 'ALL'
                  ? 'Barchasi'
                  : tab === 'pending'
                  ? `Kutilmoqda (${pendingCount})`
                  : tab === 'verified'
                  ? 'Tasdiqlangan'
                  : 'Rad etilgan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#0D0F15] shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-[#D4AE62]/10 bg-[#12141C] text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                <th className="py-4 px-6 text-start">Buyurtma</th>
                <th className="py-4 px-4 text-start">Mijoz (Avto Egasi)</th>
                <th className="py-4 px-4 text-start">Tanlangan Atelye</th>
                <th className="py-4 px-4 text-start">Buyurtma Summasi</th>
                <th className="py-4 px-4 text-start">3% Zakalat</th>
                <th className="py-4 px-4 text-start">To‘lov Usuli</th>
                <th className="py-4 px-4 text-start">Holat</th>
                <th className="py-4 px-6 text-end">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AE62]/5 text-xs">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-mono font-bold text-white text-sm block">#{o.orderNumber}</span>
                    <span className="text-[11px] text-[#64748B] block">{o.submittedAt}</span>
                  </td>

                  <td className="py-4 px-4">
                    <span className="font-bold text-white block">{o.customerName}</span>
                    <span className="font-mono text-[11px] text-[#94A3B8] block">{o.customerPhone}</span>
                  </td>

                  <td className="py-4 px-4">
                    <span className="text-white font-medium block">{o.studioName}</span>
                    <span className="text-[11px] text-[#64748B] block truncate max-w-[180px]">{o.itemDescription}</span>
                  </td>

                  <td className="py-4 px-4 font-mono text-white font-semibold">
                    ${(o.totalPriceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="py-4 px-4 font-mono font-bold text-[#D4AE62]">
                    ${(o.depositCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#161922] text-[11px] font-semibold text-white">
                      {o.paymentMethod}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        o.status === 'verified'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : o.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          o.status === 'verified'
                            ? 'bg-emerald-400'
                            : o.status === 'pending'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-rose-400'
                        }`}
                      />
                      {o.status === 'verified' ? 'Tasdiqlangan' : o.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan'}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1.5 rounded-xl bg-[#141722] hover:bg-[#1E2333] text-[#D4AE62] hover:text-[#E5C378] text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Chekni ko‘rish</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-xs text-[#D4AE62] flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#D4AE62] border-t-transparent rounded-full animate-spin" />
            <span>Supabase ma‘lumotlar bazasidan zakalat buyurtmalari yuklanmoqda...</span>
          </div>
        )}

        {!isLoading && filteredOrders.length === 0 && (
          <div className="p-12 text-center text-xs text-[#94A3B8]">
            Hech qanday zakalat buyurtmasi topilmadi.
          </div>
        )}
      </div>

      {/* Receipt Audit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#0B0C10] border border-[#D4AE62]/30 p-6 sm:p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(212,174,98,0.1)] relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-5 end-5 p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[#D4AE62]/15">
              <div className="w-10 h-10 rounded-xl bg-[#141722] flex items-center justify-center text-[#D4AE62]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  3% Zakalat Cheki #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-[#94A3B8]">{selectedOrder.studioName}</p>
              </div>
            </div>

            {selectedOrder.receiptUrl && (
              <a href={selectedOrder.receiptUrl} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-2xl border border-[#232733] bg-black">
                <img src={selectedOrder.receiptUrl} alt="To‘lov cheki" className="max-h-72 w-full object-contain" />
              </a>
            )}

            {/* Receipt Details Box */}
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl bg-[#12141C] border border-[#232733] space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                  <span className="text-[#94A3B8]">Mijoz ismi:</span>
                  <span className="text-white font-bold">{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                  <span className="text-[#94A3B8]">Telefon raqami:</span>
                  <span className="text-white font-mono">{selectedOrder.customerPhone}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                  <span className="text-[#94A3B8]">Buyurtma qismlari:</span>
                  <span className="text-white text-end max-w-[220px]">{selectedOrder.itemDescription}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                  <span className="text-[#94A3B8]">Buyurtma summasi:</span>
                  <span className="text-white font-mono font-semibold">
                    ${(selectedOrder.totalPriceCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                  <span className="text-[#94A3B8]">3% Zakalat depoziti:</span>
                  <span className="text-[#D4AE62] font-mono font-bold text-sm">
                    ${(selectedOrder.depositCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Tranzaksiya ID:</span>
                  <span className="text-sky-400 font-mono text-[11px]">{selectedOrder.transactionRef}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'verified')}
                  className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
                >
                  <Check className="w-4 h-4" />
                  <span>Tasdiqlash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'rejected')}
                  className="h-12 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rad Etish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
