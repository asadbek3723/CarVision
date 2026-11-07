'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, KeyRound, Loader2, Receipt } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { InstallAppButton } from '@/components/pwa/PwaInstallPrompt';

interface Entry {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  at: string;
}

const TYPE_LABEL: Record<string, string> = {
  TRIAL_BONUS: 'Ro‘yxatdan o‘tish bonusi',
  MONTHLY_FREE: 'Oylik bepul kredit',
  PLAN_ASSIGNED: 'Tarif krediti',
  RESERVED: 'AI render',
  COMMITTED: 'AI render',
  REFUNDED: 'Qaytarildi (xato)',
  REFERRAL_REWARD: 'Taklif mukofoti',
  ADMIN_ADJUSTMENT: 'Admin tuzatishi',
};

const pad = (n: number) => String(n).padStart(2, '0');
const when = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

const fieldCls = 'w-full rounded-2xl bg-white/[0.06] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/35 focus:bg-white/[0.1]';

/** Credit history and password change for the signed-in account (borderless, mobile first). */
export function ProfileExtras() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState<'credits' | 'password' | null>(null);

  if (!user) return null;
  return (
    <div className="mx-auto max-w-4xl space-y-3 px-5 pb-28 md:px-10">
      <InstallAppButton />
      <Accordion id="credits" open={open} onToggle={setOpen} icon={<Receipt className="h-5 w-5" />} title="Kredit tarixi" hint={`Balans: ${user.credits_balance}`}>
        <CreditHistory />
      </Accordion>
      <Accordion id="password" open={open} onToggle={setOpen} icon={<KeyRound className="h-5 w-5" />} title="Parolni almashtirish" hint="Xavfsizlik">
        <PasswordForm />
      </Accordion>
    </div>
  );
}

function Accordion({ id, open, onToggle, icon, title, hint, children }: { id: 'credits' | 'password'; open: string | null; onToggle: (v: 'credits' | 'password' | null) => void; icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <section className="rounded-3xl bg-white/[0.04]">
      <button type="button" onClick={() => onToggle(isOpen ? null : id)} aria-expanded={isOpen} className="flex w-full items-center gap-4 p-5 text-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#D4AE62]/15 text-[#D4AE62]">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-white">{title}</span>
          <span className="block text-xs text-white/45">{hint}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-white/40 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

function CreditHistory() {
  const [entries, setEntries] = React.useState<Entry[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/credits/history', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setEntries(d.entries);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-300">Tarixni yuklab bo‘lmadi.</p>;
  if (!entries) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#D4AE62]" /></div>;
  if (entries.length === 0) return <p className="text-sm text-white/50">Hali harakat yo‘q.</p>;

  return (
    <ul className="divide-y divide-white/[0.06]">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{TYPE_LABEL[e.type] ?? e.type}</p>
            <p className="text-xs text-white/40">{when(e.at)}{e.description && e.type === 'ADMIN_ADJUSTMENT' ? ` · ${e.description}` : ''}</p>
          </div>
          <div className="shrink-0 text-end">
            <p className={`text-sm font-bold tabular-nums ${e.amount > 0 ? 'text-emerald-400' : 'text-white/80'}`}>{e.amount > 0 ? `+${e.amount}` : e.amount}</p>
            <p className="text-[11px] text-white/35">qoldi {e.balanceAfter}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const PASSWORD_ERRORS: Record<string, string> = {
  WRONG_PASSWORD: 'Joriy parol noto‘g‘ri',
  WEAK_PASSWORD: 'Yangi parol kamida 8 belgi bo‘lib, harf va raqam bo‘lishi kerak',
  SAME_PASSWORD: 'Yangi parol eskisidan farq qilishi kerak',
  RATE_LIMITED: 'Juda ko‘p xato urinish. 15 daqiqadan keyin urinib ko‘ring',
  UNAUTHENTICATED: 'Sessiya tugagan. Qaytadan tizimga kiring',
};

function PasswordForm() {
  const { refreshProfile, signOut } = useAuth();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [again, setAgain] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setMsg(null);
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      return setMsg({ ok: false, text: PASSWORD_ERRORS['WEAK_PASSWORD']! });
    }
    if (next !== again) return setMsg({ ok: false, text: 'Yangi parollar bir xil emas' });
    if (next === current) return setMsg({ ok: false, text: PASSWORD_ERRORS['SAME_PASSWORD']! });
    setBusy(true);
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; code?: string; error?: string };
      if (res.ok && data.success) {
        setMsg({ ok: true, text: 'Parol almashtirildi' });
        setCurrent('');
        setNext('');
        setAgain('');
        void refreshProfile();
        return;
      }
      if (res.status === 401 && data.code === 'UNAUTHENTICATED') {
        // The cached profile outlived the server session: sign out cleanly and ask to log in again.
        setMsg({ ok: false, text: PASSWORD_ERRORS['UNAUTHENTICATED']! });
        await signOut();
        setTimeout(() => {
          window.location.href = `/${locale}/login`;
        }, 1200);
        return;
      }
      const fallback = res.status >= 500 ? 'Serverda xatolik. Birozdan keyin qayta urinib ko‘ring' : 'Almashtirib bo‘lmadi';
      setMsg({ ok: false, text: (data.code && PASSWORD_ERRORS[data.code]) || data.error || fallback });
    } catch {
      setMsg({ ok: false, text: 'Internet bilan aloqa yo‘q. Qayta urinib ko‘ring' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Joriy parol" maxLength={72} className={fieldCls} />
      <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Yangi parol (8+ belgi, harf va raqam)" maxLength={72} className={fieldCls} />
      <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="Yangi parolni takrorlang" maxLength={72} className={fieldCls} />
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}
      <button type="submit" disabled={busy || !current || !next || !again} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AE62] py-3.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Parolni almashtirish
      </button>
    </form>
  );
}
