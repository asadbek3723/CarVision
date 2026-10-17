'use client';

import * as React from 'react';
import { ShieldCheck, Lock, Key, History } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  admin: string;
  ip: string;
  timestamp: string;
  status: 'SUCCESS' | 'BLOCKED';
  details: string;
}

const AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    action: 'ADMIN_PIN_VERIFIED',
    admin: 'kursant410@gmail.com',
    ip: '178.218.201.10',
    timestamp: 'Hozirgina',
    status: 'SUCCESS',
    details: 'Master PIN muvaffaqiyatli tasdiqlandi. HMAC sessiyasi berildi.',
  },
  {
    id: 'log-02',
    action: 'PLAN_ASSIGNED',
    admin: 'kursant410@gmail.com',
    ip: '178.218.201.10',
    timestamp: '14 daqiqa oldin',
    status: 'SUCCESS',
    details: 'Apex Customs Studio uchun MAX_4000 tarifi berildi ($99 to‘lov)',
  },
  {
    id: 'log-03',
    action: 'ESCROW_RECEIPT_VERIFIED',
    admin: 'kursant410@gmail.com',
    ip: '178.218.201.10',
    timestamp: '42 daqiqa oldin',
    status: 'SUCCESS',
    details: 'Buyurtma #CV-9820 uchun $144 zakalat depoziti tasdiqlandi',
  },
  {
    id: 'log-04',
    action: 'RATE_LIMIT_SHIELD',
    admin: 'Tizim Xavfsizlik Qo‘riqchisi',
    ip: '194.26.29.114',
    timestamp: '2 soat oldin',
    status: 'BLOCKED',
    details: 'Begona IP orqali ketma-ket noto‘g‘ri PIN kiritishga urinish to‘xtatildi',
  },
  {
    id: 'log-05',
    action: 'DEVICE_SESSION_EVICTED',
    admin: 'kursant410@gmail.com',
    ip: '178.218.201.10',
    timestamp: '4 soat oldin',
    status: 'SUCCESS',
    details: 'Buxoro Auto Custom uchun noma‘lum qurilma sessiyasi masofadan uzildi',
  },
];

export function AdminSecurityView() {
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
              Xavfsizlik va Audit Harakatlari Tarixi
            </h3>
          </div>
          <span className="text-xs text-[#94A3B8]">O‘zgarmas tizim yozuvlari</span>
        </div>

        <div className="divide-y divide-[#D4AE62]/5 text-xs">
          {AUDIT_LOGS.map((log) => (
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
      </div>
    </div>
  );
}
