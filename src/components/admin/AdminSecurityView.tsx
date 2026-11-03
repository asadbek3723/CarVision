'use client';

import * as React from 'react';
import { ShieldCheck, Lock, Key, History, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  admin: string;
  ip: string;
  timestamp: string;
  status: 'SUCCESS' | 'BLOCKED';
  details: string;
}

export function AdminSecurityView() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/audit-logs');
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Security Clearance Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Master PIN Xavfsizligi</span>
            <div className="w-8 h-8 rounded-xl bg-[#D4AE62]/10 text-[#D4AE62] flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">Faqat Serverda</span>
            <span className="text-[10px] text-emerald-400 font-bold">TimingSafe</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Frontend kodida qoldirilmagan, brute-force ga qarshi himoyalangan
          </p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Sessiya Tokeni</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">HMAC-SHA256</span>
            <span className="text-[10px] text-emerald-400 font-bold">HttpOnly</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            4 soatlik amal qilish muddati, XSS va CSRF hujumlariga chidamli
          </p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Brute-Force Rate Limiter</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">5 ta Urinish</span>
            <span className="text-[10px] text-purple-400 font-bold">15m Blok</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Har bir IP manzil uchun avtomatik vaqtinchalik cheklov
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-[#0D0F15] shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-[#D4AE62]/15 overflow-hidden">
        <div className="p-5 border-b border-[#D4AE62]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#D4AE62]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Xavfsizlik va Audit Harakatlari Tarixi (Supabase)
            </h3>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#D4AE62] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            {error}. Supabase bilan ulanishda xatolik.
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[#64748B] text-xs">
            Hozircha audit yozuvlari mavjud emas.
          </div>
        ) : (
          <div className="divide-y divide-[#D4AE62]/5 text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-[11px] font-mono text-[#94A3B8]">IP: {log.ip}</span>
                  </div>
                  <p className="text-white font-medium">{log.details}</p>
                  <p className="text-[11px] text-[#64748B]">Bajaruvchi: {log.admin}</p>
                </div>

                <div className="text-end text-[11px] text-[#94A3B8] shrink-0 font-mono">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
