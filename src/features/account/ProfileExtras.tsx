'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useApiError } from '@/lib/api-error';
import { useTranslations } from 'next-intl';
import { ChevronDown, KeyRound, Loader2, Receipt } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { readJson } from '@/lib/safe-json';

interface Entry {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  at: string;
}

type PanelId = 'credits' | 'password';

const TYPES = new Set(['TRIAL_BONUS', 'MONTHLY_FREE', 'PLAN_ASSIGNED', 'RESERVED', 'COMMITTED', 'REFUNDED', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT']);

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0F]';

const pad = (n: number) => String(n).padStart(2, '0');
const when = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

const fieldCls = `w-full rounded-2xl bg-white/[0.06] px-4 py-3.5 text-base text-white placeholder:text-white/35 ${focusRing}`;

/** Credit history and password change for the signed-in account. */
export function ProfileExtras() {
  const t = useTranslations('profileExtras');
  const { user } = useAuth();
  const [open, setOpen] = React.useState<PanelId | null>(null);

  if (!user) return null;
  return (
    <div className="space-y-3">
      <Panel id="credits" open={open} onToggle={setOpen} icon={<Receipt className="h-5 w-5" />} title={t('creditHistory')} hint={t('balance', { count: user.credits_balance })}>
        <CreditHistory />
      </Panel>
      <Panel id="password" open={open} onToggle={setOpen} icon={<KeyRound className="h-5 w-5" />} title={t('changePassword')} hint={t('security')}>
        <PasswordForm />
      </Panel>
    </div>
  );
}

function Panel({ id, open, onToggle, icon, title, hint, children }: { id: PanelId; open: PanelId | null; onToggle: (v: PanelId | null) => void; icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <section className="rounded-3xl bg-white/[0.04]">
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        className={`flex min-h-14 w-full items-center gap-4 rounded-3xl px-5 py-4 text-start ${focusRing}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-500">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="block truncate text-xs text-white/45">{hint}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div id={`panel-${id}`} className="px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

function CreditHistory() {
  const t = useTranslations('profileExtras');
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

  if (error) return <p role="alert" className="text-sm text-red-300">{t('errHistory')}</p>;
  if (!entries) return <div className="flex justify-center py-6" role="status"><Loader2 className="h-5 w-5 animate-spin text-gold-500" /></div>;
  if (entries.length === 0) return <p className="text-sm text-white/50">{t('noActivity')}</p>;

  return (
    <ul className="divide-y divide-white/[0.06]">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{TYPES.has(e.type) ? t(`types.${e.type}`) : e.type}</p>
            <p className="text-xs text-white/40">{when(e.at)}{e.description && e.type === 'ADMIN_ADJUSTMENT' ? ` · ${e.description}` : ''}</p>
          </div>
          <div className="shrink-0 text-end">
            <p className={`text-sm font-semibold tabular-nums ${e.amount > 0 ? 'text-emerald-400' : 'text-white/80'}`}>{e.amount > 0 ? `+${e.amount}` : e.amount}</p>
            <p className="text-[11px] text-white/35">{t('left', { count: e.balanceAfter })}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PasswordForm() {
  const t = useTranslations('profileExtras');
  const apiError = useApiError();
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
      return setMsg({ ok: false, text: apiError({ code: 'WEAK_PASSWORD' }, t('errChange')) });
    }
    if (next !== again) return setMsg({ ok: false, text: t('errMismatch') });
    if (next === current) return setMsg({ ok: false, text: apiError({ code: 'SAME_PASSWORD' }, t('errChange')) });
    setBusy(true);
    try {
      const res = await fetch('/api/v1/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = (await readJson(res)).data;
      if (res.ok && data.success) {
        setMsg({ ok: true, text: t('changed') });
        setCurrent('');
        setNext('');
        setAgain('');
        void refreshProfile();
        return;
      }
      if (res.status === 401 && data.code === 'UNAUTHENTICATED') {
        // The cached profile outlived the server session: sign out cleanly and ask to log in again.
        setMsg({ ok: false, text: apiError(data, t('errChange')) });
        await signOut();
        setTimeout(() => {
          window.location.href = `/${locale}/login`;
        }, 1200);
        return;
      }
      setMsg({ ok: false, text: apiError(data, t('errChange')) });
    } catch {
      setMsg({ ok: false, text: apiError({ code: 'NETWORK' }, t('errChange')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <input type="password" aria-label={t('phCurrent')} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={t('phCurrent')} maxLength={72} className={fieldCls} />
      <input type="password" aria-label={t('phNew')} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={t('phNew')} maxLength={72} className={fieldCls} />
      <input type="password" aria-label={t('phAgain')} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder={t('phAgain')} maxLength={72} className={fieldCls} />
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}
      <button type="submit" disabled={busy || !current || !next || !again} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-500 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50 ${focusRing}`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('changePassword')}
      </button>
    </form>
  );
}
