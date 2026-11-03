'use client';

import * as React from 'react';
import { AlertCircle, Loader2, RefreshCw, Search, X } from 'lucide-react';

/* ------------------------------------------------------------------ session handling */

const AdminSessionContext = React.createContext<{ onExpired: () => void }>({ onExpired: () => undefined });

export function AdminSessionProvider({ onExpired, children }: { onExpired: () => void; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ onExpired }), [onExpired]);
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

/** fetch for admin APIs: returns parsed JSON, throws a readable Error, and reports an expired session. */
export function useAdminApi() {
  const { onExpired } = React.useContext(AdminSessionContext);
  return React.useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onExpired();
        throw new Error('Admin sessiyasi tugagan. PIN kodni qayta kiriting');
      }
      if (!res.ok || data.success === false) throw new Error(data.error || 'Xatolik yuz berdi');
      return data as T;
    },
    [onExpired]
  );
}

/** Loads `url` on mount and whenever `url` changes; exposes reload. */
export function useAdminData<T>(url: string) {
  const api = useAdminApi();
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const seq = React.useRef(0);

  const load = React.useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const d = await api<T>(url);
      if (id === seq.current) setData(d);
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [api, url]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

/* ------------------------------------------------------------------ formatting */

export const nf = new Intl.NumberFormat('uz-UZ');
export const usd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'hozirgina';
  if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} kun oldin`;
  return dateTime(iso).slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** dd.MM HH:mm in Tashkent time (locale-independent, so it reads the same on every device). */
export function dateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export const PLAN_LABEL: Record<string, string> = { FREE_TRIAL: 'Free', PRO_800: 'Pro', MAX_4000: 'Max', ULTRA_10000: 'Ultra', CUSTOM: 'Custom' };

/* ------------------------------------------------------------------ primitives (borderless, soft surfaces) */

export function Surface({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-3xl bg-white/[0.04] ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string | undefined; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string | undefined; accent?: 'gold' | 'green' | 'amber' | 'red' | undefined }) {
  const color = accent === 'gold' ? 'text-[#D4AE62]' : accent === 'green' ? 'text-emerald-400' : accent === 'amber' ? 'text-amber-300' : accent === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className="rounded-3xl bg-white/[0.04] p-4 sm:p-5">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'gold' | 'green' | 'amber' | 'red' | 'blue'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/10 text-white/70',
    gold: 'bg-[#D4AE62]/15 text-[#D4AE62]',
    green: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
    red: 'bg-red-500/15 text-red-300',
    blue: 'bg-sky-500/15 text-sky-300',
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-white/50" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-[#D4AE62]" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl bg-red-500/10 px-6 py-10 text-center">
      <AlertCircle className="h-7 w-7 text-red-300" />
      <p className="text-sm text-red-200">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/15">
          <RefreshCw className="h-3.5 w-3.5" />
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-white/[0.03] px-6 py-14 text-center text-sm text-white/50">{children}</div>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-white/[0.06] py-3 ps-11 pe-4 text-sm text-white outline-none placeholder:text-white/35 focus:bg-white/[0.09]"
      />
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ id: T; label: string; count?: number }> }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${value === o.id ? 'bg-[#D4AE62] text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/10'}`}
        >
          {o.label}
          {typeof o.count === 'number' && <span className="ms-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-[#101218] p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:max-w-lg sm:rounded-[28px] sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass = 'w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:bg-white/[0.1]';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/55">{label}</span>
      {children}
    </label>
  );
}

export function useToast() {
  const [msg, setMsg] = React.useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = React.useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setMsg({ text, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3500);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const node = msg ? (
    <div role="status" className={`fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-md rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-2xl md:bottom-8 ${msg.tone === 'ok' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
      {msg.text}
    </div>
  ) : null;
  return { show, node };
}

/** Tiny dependency-free bar chart (7 days). */
export function BarChart({ points, color = '#D4AE62', label }: { points: Array<{ day: string; value: number }>; color?: string; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div role="img" aria-label={label}>
      <div className="flex h-28 items-end gap-2">
        {points.map((p) => (
          <div key={p.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] tabular-nums text-white/50">{p.value || ''}</span>
            <div className="w-full rounded-t-lg" style={{ height: `${Math.max(4, (p.value / max) * 100)}%`, background: p.value ? color : 'rgba(255,255,255,0.08)' }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {points.map((p) => (
          <span key={p.day} className="flex-1 text-center text-[10px] text-white/40">
            {['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'][new Date(`${p.day}T12:00:00Z`).getUTCDay()]}
          </span>
        ))}
      </div>
    </div>
  );
}
