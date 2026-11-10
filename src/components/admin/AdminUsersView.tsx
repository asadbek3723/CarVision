'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Coins, History, Warehouse, Ban, Phone, ShieldCheck, Undo2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Field, LoadMore, PLAN_LABEL, PageHeader, Pill, SearchField, Segmented, Sheet, Spinner, Surface, dateTime, fieldClass, newRequestId, useAdminApi, useAdminFormat, useAdminPaged, useToast } from './ui';
import { AdminLedgerSheet } from './AdminLedgerSheet';
import { buttonClasses } from '@/components/ui';

interface User {
  id: string;
  role: string;
  name: string;
  phone: string;
  credits: number;
  plan: string;
  shopName: string | null;
  shopId: string | null;
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
  const { items: users, meta, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<User, { users: User[]; total: number; nextOffset: number | null }>(url, (p) => p.users);
  const data = meta;
  const api = useAdminApi();
  const toast = useToast();
  const [creditFor, setCreditFor] = React.useState<User | null>(null);
  const [banFor, setBanFor] = React.useState<User | null>(null);
  const [historyFor, setHistoryFor] = React.useState<User | null>(null);
  const [confirm, setConfirm] = React.useState<{ kind: 'unban' | 'garage'; user: User } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const unban = async (u: User) => {
    setBusy(u.id);
    try {
      await api('/api/v1/admin/users', { method: 'PATCH', body: JSON.stringify({ userId: u.id, banned: false }) });
      toast.show(t('toastUnbanned'));
      setConfirm(null);
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
      setConfirm(null);
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
        ) : users.length === 0 ? (
          <EmptyState>{t('empty')}</EmptyState>
        ) : (
          users.map((u) => (
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
                  <button type="button" onClick={() => setCreditFor(u)} className={buttonClasses({ size: 'sm' })}>
                    <Coins className="h-3.5 w-3.5" />
                    {t('credit')}
                  </button>
                  <button type="button" onClick={() => setHistoryFor(u)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15">
                    <History className="h-3.5 w-3.5" />
                    {t('history')}
                  </button>
                  {!u.shopName && (
                    <button type="button" disabled={busy === u.id} onClick={() => setConfirm({ kind: 'garage', user: u })} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                      <Warehouse className="h-3.5 w-3.5" />
                      {t('openGarage')}
                    </button>
                  )}
                  {u.banned ? (
                    <button type="button" disabled={busy === u.id} onClick={() => setConfirm({ kind: 'unban', user: u })} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50">
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
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={users.length} total={data?.total ?? 0} />

      <AdminLedgerSheet target={historyFor ? { title: t('historyTitle', { name: historyFor.name || historyFor.phone }), userId: historyFor.id } : null} onClose={() => setHistoryFor(null)} />
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        busy={Boolean(confirm && busy === confirm.user.id)}
        title={confirm?.kind === 'garage' ? t('openGarage') : t('unban')}
        body={confirm ? (confirm.kind === 'garage' ? t('confirmGarage', { name: confirm.user.name || confirm.user.phone, count: nf.format(confirm.user.credits) }) : t('confirmUnban', { name: confirm.user.name || confirm.user.phone })) : null}
        confirmLabel={confirm?.kind === 'garage' ? t('openGarage') : t('unban')}
        tone="gold"
        onConfirm={() => confirm && void (confirm.kind === 'garage' ? openGarage(confirm.user) : unban(confirm.user))}
      />

      <CreditSheet user={creditFor} onClose={() => setCreditFor(null)} onDone={(m) => { setCreditFor(null); toast.show(m); void reload(); }} onError={(m) => toast.show(m, 'err')} />
      <BanSheet user={banFor} onClose={() => setBanFor(null)} onDone={() => { setBanFor(null); toast.show(t('toastBanned')); void reload(); }} onError={(m) => toast.show(m, 'err')} />
    </div>
  );
}

const METHODS = ['BANK_TRANSFER', 'CASH', 'CLICK_PAYME_MANUAL', 'OCTO'] as const;
const METHOD_KEY: Record<(typeof METHODS)[number], string> = { BANK_TRANSFER: 'mBank', CASH: 'mCash', CLICK_PAYME_MANUAL: 'mClick', OCTO: 'mOcto' };
const MAX_ADJUST = 100000;

function CreditSheet({ user, onClose, onDone, onError }: { user: User | null; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const t = useTranslations('adm.users');
  const ts = useTranslations('adm.shops');
  const tc = useTranslations('adm.common');
  const { nf } = useAdminFormat();
  const api = useAdminApi();
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [sale, setSale] = React.useState(false);
  const [paid, setPaid] = React.useState('');
  const [currency, setCurrency] = React.useState<'UZS' | 'USD' | 'AED' | 'EUR'>('UZS');
  const [method, setMethod] = React.useState<(typeof METHODS)[number]>('BANK_TRANSFER');
  const [reference, setReference] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  // One id per opened form: a double click or a retry after a lost response is applied once.
  const requestId = React.useRef(newRequestId());
  React.useEffect(() => {
    if (user) {
      setAmount('');
      setReason('');
      setSale(false);
      setPaid('');
      setReference('');
      requestId.current = newRequestId();
    }
  }, [user]);

  const n = Math.trunc(Number(amount)) || 0;
  const after = user ? user.credits + n : 0;
  const tooBig = Math.abs(n) > MAX_ADJUST;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!n || tooBig) return onError(t('errAmount'));
    if (after < 0) return onError(t('errNegative'));
    if (reason.trim().length < 3) return onError(t('errReason'));
    const paidNum = Number(paid.replace(/\s/g, '').replace(',', '.')) || 0;
    if (sale && (n < 0 || paidNum <= 0)) return onError(t('errSale'));
    setSaving(true);
    try {
      const r = await api<{ balance: number }>('/api/v1/admin/users/credits', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          requestId: requestId.current,
          amount: n,
          reason: reason.trim(),
          ...(sale ? { payment: { amountMinor: Math.round(paidNum * 100), currency, method, ...(reference.trim() ? { reference: reference.trim() } : {}) } } : {}),
        }),
      });
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
          <input type="number" inputMode="numeric" min={-MAX_ADJUST} max={MAX_ADJUST} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" className={fieldClass} />
        </Field>
        <p className={`text-xs ${after < 0 || tooBig ? 'text-red-300' : 'text-white/50'}`}>
          {tooBig ? t('rangeHint', { max: nf.format(MAX_ADJUST) }) : n ? t('afterPreview', { count: nf.format(after) }) : t('rangeHint', { max: nf.format(MAX_ADJUST) })}
        </p>
        <Field label={t('fReason')}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t('reasonPh')} className={fieldClass} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/80">
          <input type="checkbox" checked={sale} onChange={(e) => setSale(e.target.checked)} className="h-4 w-4 accent-[#E8BF74]" />
          {t('isSale')}
        </label>
        {sale && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label={ts('fPaidAmount')}>
                <input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={fieldClass} />
              </Field>
              <Field label={ts('fCurrency')}>
                <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className={fieldClass}>
                  {(['UZS', 'USD', 'AED', 'EUR'] as const).map((c) => <option key={c} value={c} className="bg-surface-1">{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label={ts('fMethod')}>
              <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={fieldClass}>
                {METHODS.map((m) => <option key={m} value={m} className="bg-surface-1">{ts(METHOD_KEY[m])}</option>)}
              </select>
            </Field>
            <Field label={ts('fReference')}>
              <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} className={fieldClass} />
            </Field>
          </div>
        )}
        <button type="submit" disabled={saving || !n || tooBig || after < 0} className="w-full rounded-full bg-gold-500 py-3.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
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
