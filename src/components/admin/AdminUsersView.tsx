'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Coins, Warehouse, Ban, Phone, ShieldCheck, Undo2 } from 'lucide-react';
import { EmptyState, ErrorState, Field, PLAN_LABEL, PageHeader, Pill, SearchField, Segmented, Sheet, Spinner, Surface, dateTime, fieldClass, useAdminApi, useAdminData, useAdminFormat, useToast } from './ui';

interface User {
  id: string;
  role: string;
  name: string;
  phone: string;
  credits: number;
  plan: string;
  shopName: string | null;
  banned: boolean;
  bannedReason: string | null;
  phoneVerified: boolean;
  createdAt: string;
}

type RoleFilter = 'all' | 'b2c_user' | 'b2b_seller' | 'super_admin';
const ROLE_KEY: Record<string, string> = { b2c_user: 'roleCustomer', b2b_seller: 'roleSeller', super_admin: 'roleAdmin' };

export function AdminUsersView() {
  const t = useTranslations('adm.users');
  const tc = useTranslations('adm.common');
  const { nf } = useAdminFormat();
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [role, setRole] = React.useState<RoleFilter>('all');
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const url = `/api/v1/admin/users?${new URLSearchParams({ ...(debounced ? { q: debounced } : {}), ...(role !== 'all' ? { role } : {}) }).toString()}`;
  const { data, error, loading, reload } = useAdminData<{ users: User[]; total: number }>(url);
  const api = useAdminApi();
  const toast = useToast();
  const [creditFor, setCreditFor] = React.useState<User | null>(null);
  const [banFor, setBanFor] = React.useState<User | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const unban = async (u: User) => {
    setBusy(u.id);
    try {
      await api('/api/v1/admin/users', { method: 'PATCH', body: JSON.stringify({ userId: u.id, banned: false }) });
      toast.show(t('toastUnbanned'));
      await reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('error'), 'err');
    } finally {
      setBusy(null);
    }
  };

  const openGarage = async (u: User) => {
    setBusy(u.id);
    try {
      await api('/api/v1/admin/shops', { method: 'POST', body: JSON.stringify({ userId: u.id }) });
      toast.show(t('toastGarage'));
      await reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('error'), 'err');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {toast.node}
      <PageHeader title={t('title')} subtitle={data ? t('subtitle', { count: nf.format(data.total) }) : undefined} />
      <div className="space-y-3">
        <SearchField value={q} onChange={setQ} placeholder={t('search')} />
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { id: 'all', label: tc('all') },
            { id: 'b2c_user', label: t('fCustomers') },
            { id: 'b2b_seller', label: t('fSellers') },
            { id: 'super_admin', label: t('fAdmins') },
          ]}
        />
      </div>

      <div className="mt-5 space-y-3">
        {loading && !data ? (
          <Spinner />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (data?.users.length ?? 0) === 0 ? (
          <EmptyState>{t('empty')}</EmptyState>
        ) : (
          data!.users.map((u) => (
            <Surface key={u.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">{u.name || t('unnamed')}</h3>
                  <a href={`tel:${u.phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white">
                    <Phone className="h-3.5 w-3.5" />
                    {u.phone}
                  </a>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={u.role === 'super_admin' ? 'gold' : u.role === 'b2b_seller' ? 'blue' : 'neutral'}>{ROLE_KEY[u.role] ? t(ROLE_KEY[u.role] as string) : u.role}</Pill>
                  {u.role === 'b2b_seller' && <Pill tone={u.plan === 'FREE_TRIAL' ? 'neutral' : 'gold'}>{PLAN_LABEL[u.plan] ?? u.plan}</Pill>}
                  {u.phoneVerified && <Pill tone="green">{t('phoneVerified')}</Pill>}
                  {u.banned && <Pill tone="red">{t('banned')}</Pill>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/50">
                <span>{t.rich('credits', { count: nf.format(u.credits), b: (c) => <b className="text-white">{c}</b> })}</span>
                {u.shopName && <span>{t.rich('shop', { name: u.shopName, b: (c) => <b className="text-white">{c}</b> })}</span>}
                <span>{t('registered', { date: dateTime(u.createdAt) })}</span>
              </div>
              {u.banned && u.bannedReason && <p className="mt-2 text-xs text-red-300">{t('reason', { reason: u.bannedReason })}</p>}

              {u.role !== 'super_admin' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setCreditFor(u)} className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AE62] px-4 py-2.5 text-xs font-bold text-black hover:brightness-110">
                    <Coins className="h-3.5 w-3.5" />
                    {t('credit')}
                  </button>
                  {!u.shopName && (
                    <button type="button" disabled={busy === u.id} onClick={() => void openGarage(u)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                      <Warehouse className="h-3.5 w-3.5" />
                      {t('openGarage')}
                    </button>
                  )}
                  {u.banned ? (
                    <button type="button" disabled={busy === u.id} onClick={() => void unban(u)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                      <Undo2 className="h-3.5 w-3.5" />
                      {t('unban')}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setBanFor(u)} className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/25">
                      <Ban className="h-3.5 w-3.5" />
                      {t('ban')}
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/40"><ShieldCheck className="h-3.5 w-3.5" />{t('protected')}</p>
              )}
            </Surface>
          ))
        )}
      </div>

      <CreditSheet user={creditFor} onClose={() => setCreditFor(null)} onDone={(m) => { setCreditFor(null); toast.show(m); void reload(); }} onError={(m) => toast.show(m, 'err')} />
      <BanSheet user={banFor} onClose={() => setBanFor(null)} onDone={() => { setBanFor(null); toast.show(t('toastBanned')); void reload(); }} onError={(m) => toast.show(m, 'err')} />
    </div>
  );
}

function CreditSheet({ user, onClose, onDone, onError }: { user: User | null; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const t = useTranslations('adm.users');
  const tc = useTranslations('adm.common');
  const { nf } = useAdminFormat();
  const api = useAdminApi();
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (user) {
      setAmount('');
      setReason('');
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const n = Math.trunc(Number(amount));
    if (!n) return onError(t('errAmount'));
    if (reason.trim().length < 3) return onError(t('errReason'));
    setSaving(true);
    try {
      const r = await api<{ balance: number }>('/api/v1/admin/users/credits', { method: 'POST', body: JSON.stringify({ userId: user.id, amount: n, reason: reason.trim() }) });
      onDone(t('newBalance', { count: nf.format(r.balance) }));
    } catch (err) {
      onError(err instanceof Error ? err.message : t('errDo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={Boolean(user)} onClose={onClose} title={user ? t('creditTitle', { name: user.name || user.phone }) : t('credit')}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-white/60">{t.rich('balance', { count: user ? nf.format(user.credits) : '', b: (c) => <b className="text-white">{c}</b> })}</p>
        <Field label={t('fAmount')}>
          <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" className={fieldClass} />
        </Field>
        <Field label={t('fReason')}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t('reasonPh')} className={fieldClass} />
        </Field>
        <button type="submit" disabled={saving} className="w-full rounded-full bg-[#D4AE62] py-3.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60">
          {saving ? tc('saving') : t('save')}
        </button>
      </form>
    </Sheet>
  );
}

function BanSheet({ user, onClose, onDone, onError }: { user: User | null; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const t = useTranslations('adm.users');
  const api = useAdminApi();
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (user) setReason('');
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api('/api/v1/admin/users', { method: 'PATCH', body: JSON.stringify({ userId: user.id, banned: true, reason: reason.trim() || undefined }) });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('errDo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={Boolean(user)} onClose={onClose} title={user ? t('banTitle', { name: user.name || user.phone }) : t('ban')}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-white/60">{t('banInfo')}</p>
        <Field label={t('fReasonOpt')}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={fieldClass} />
        </Field>
        <button type="submit" disabled={saving} className="w-full rounded-full bg-red-500 py-3.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60">
          {saving ? t('banning') : t('banSubmit')}
        </button>
      </form>
    </Sheet>
  );
}
