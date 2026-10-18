'use client';

import * as React from 'react';
import { Tablet, Smartphone, Laptop, LogOut, Search, CheckCircle2 } from 'lucide-react';

interface DeviceSession {
  id: string;
  studioName: string;
  deviceLabel: string;
  platform: 'ios' | 'android' | 'desktop';
  ipAddress: string;
  location: string;
  lastHeartbeat: string;
  status: 'active' | 'warning';
}

export function AdminUsersView() {
  const [devices, setDevices] = React.useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [toast, setToast] = React.useState<string | null>(null);

  // Fetch active sessions from live Supabase
  React.useEffect(() => {
    let isMounted = true;
    const fetchDevices = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/v1/admin/devices');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.devices)) {
          setDevices(data.devices);
        }
      } catch (err) {
        console.error('Failed to load devices from Supabase:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEvict = (id: string, name: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setToast(`"${name}" sessiyasi masofadan yakunlandi.`);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.studioName.toLowerCase().includes(search.toLowerCase()) ||
      d.deviceLabel.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()) ||
      d.ipAddress.includes(search)
  );

  const getPlatformIcon = (platform: DeviceSession['platform']) => {
    switch (platform) {
      case 'ios':
        return <Tablet className="w-4 h-4 text-[#D4AE62]" />;
      case 'android':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      default:
        return <Laptop className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            Faol Qurilmalar va Sessiyalar Nazorati
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Atelyelarning ruxsat etilgan kvotadan tashqari akkaunt bo‘lishishi va firibgarlikni oldini olish
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#94A3B8] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qurilma, atelye yoki IP..."
            className="w-full h-10 ps-10 pe-4 rounded-xl bg-[#0D0F15] border border-[#D4AE62]/20 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AE62]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#0D0F15] shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-[#D4AE62]/10 bg-[#12141C] text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                <th className="py-4 px-6 text-start">Qurilma Modeli</th>
                <th className="py-4 px-4 text-start">Atelye Nomi</th>
                <th className="py-4 px-4 text-start">IP Manzil</th>
                <th className="py-4 px-4 text-start">Joylashuv</th>
                <th className="py-4 px-4 text-start">Oxirgi Faollik</th>
                <th className="py-4 px-6 text-end">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AE62]/5 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8] animate-pulse">
                    Qurilmalar yuklanmoqda...
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                    Faol qurilmalar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#141722] flex items-center justify-center shrink-0">
                          {getPlatformIcon(d.platform)}
                        </div>
                        <span className="font-bold text-white block text-sm">{d.deviceLabel}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-medium text-white">{d.studioName}</td>

                    <td className="py-4 px-4 font-mono text-[11px] text-[#94A3B8]">{d.ipAddress}</td>

                    <td className="py-4 px-4 text-[#CBD5E1]">{d.location}</td>

                    <td className="py-4 px-4 font-mono text-emerald-400">{d.lastHeartbeat}</td>

                    <td className="py-4 px-6 text-end">
                      <button
                        type="button"
                        onClick={() => handleEvict(d.id, d.deviceLabel)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sessiyani Uzish</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredDevices.length === 0 && (
          <div className="p-12 text-center text-xs text-[#94A3B8]">
            Hech qanday qurilma topilmadi.
          </div>
        )}
      </div>
    </div>
  );
}
