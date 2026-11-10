'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { AlertTriangle, BadgeCheck, Coins, CreditCard, History, MapPin, Phone } from 'lucide-react';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadMore,
  PLAN_LABEL,
  PageHeader,
  Pill,
  SearchField,
  Segmented,
  Sheet,
  Spinner,
  Surface,
  dateTime,
  fieldClass,
  newRequestId,
  useAdminApi,
  useAdminFormat,
  useAdminPaged,
  useDebounced,
  useToast,
} from './ui';
import { AdminLedgerSheet } from './AdminLedgerSheet';
import { buttonClasses } from '@/components/ui';

interface Shop {
  id: string;
  ownerId: string;
  name: string;
  city: string;
  district: string;
  phone: string;
  ownerName: string;
  ownerPhone: string;
  banned: boolean;
  verified: boolean;
  plan: string;
  isPaid: boolean;
  expiresAt: string | null;
  credits: number;
  payoutDetails: string | null;
  items: number;
  createdAt: string;
}

interface Plan {
  code: string;
  name: string;
  credits: number;
  durationDays: number;
  priceUSD: number;
}

type Filter = 'all' | 'paid' | 'free' | 'unverified';
interface Page {
  shops: Shop[];
  total: number;
  nextOffset: number | null;
  counts: Record<Filter, number>;
}

const METHODS = [
  { id: 'BANK_TRANSFER', label: 'mBank' },
  { id: 'CASH', label: 'mCash' },
  { id: 'CLICK_PAYME_MANUAL', label: 'mClick' },
  { id: 'OCTO', label: 'mOcto' },
] as const;

export function AdminShopsView() {
  const t = useTranslations('adm.shops');
  const tc = useTranslations('adm.common');
  const { nf } = useAdminFormat();
  const [q, setQ] = React.useState('');
  const dq = useDebounced(q.trim());
  const [filter, setFilter] = React.useState<Filter>('all');
  const url = `/api/v1/admin/shops?filter=${filter}${dq ? `&q=${encodeURIComponent(dq)}` : ''}`;
  const { items: shops, meta, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Shop, Page>(url, (p) => p.shops);
  const counts = meta?.counts;
  const api = useAdminApi();
  const toast = useToast();
  const [planFor, setPlanFor] = React.useState<Shop | null>(null);
  const [historyFor, setHistoryFor] = React.useState<Shop | null>(null);
  const [payoutFor, setPayoutFor] = React.useState<Shop | null>(null);
  const [verifyFor, setVerifyFor] = React.useState<Shop | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const toggleVerified = async (s: Shop) => {
    setBusy(s.id);
    try {
      await api('/api/v1/admin/shops', { method: 'PATCH', body: JSON.stringify({ shopId: s.id, verified: !s.verified }) });
      toast.show(s.verified ? t('toastUnverified') : t('toastVerified'));
      setVerifyFor(null);
      await reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('error'), 'err');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !meta) return <Spinner />;
  if (error && !meta) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      {toast.node}
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: counts?.all ?? 0 })} />
      <div className="space-y-3">
        <SearchField value={q} onChange={setQ} placeholder={t('search')} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: tc('all'), count: counts?.all ?? 0 },
            { id: 'paid', label: t('fPaid'), count: counts?.paid ?? 0 },
            { id: 'free', label: t('fFree'), count: counts?.free ?? 0 },
            { id: 'unverified', label: t('fUnverified'), count: counts?.unverified ?? 0 },
          ]}
        />
      </div>

      {error && meta && <div className="mt-4"><ErrorState message={error} onRetry={reload} /></div>}
      <div className={`mt-5 space-y-3 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {shops.length === 0 && !loading && <EmptyState>{t('empty')}</EmptyState>}
        {shops.map((s) => (
          <Surface key={s.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-white">{s.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50"><MapPin className="h-3.5 w-3.5 shrink-0" />{s.city}{s.district && s.district !== '-' ? `, ${s.district}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone={s.isPaid ? 'gold' : 'neutral'}>{PLAN_LABEL[s.plan] ?? s.plan}</Pill>
                {s.verified ? <Pill tone="green">{t('verified')}</Pill> : <Pill tone="amber">{t('notVerified')}</Pill>}
                {s.banned && <Pill tone="red">{t('banned')}</Pill>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.04] py-3">
                <p className="text-lg font-bold tabular-nums text-white">{nf.format(s.credits)}</p>
                <p className="text-[10px] text-white/45">{t('credits')}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] py-3">
                <p className="text-lg font-bold tabular-nums text-white">{s.items}</p>
                <p className="text-[10px] text-white/45">{t('parts')}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] py-3">
                <p className="text-xs font-bold text-white">{s.isPaid && s.expiresAt ? dateTime(s.expiresAt) : '—'}</p>
                <p className="text-[10px] text-white/45">{t('expires')}</p>
              </div>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-white/50">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              {s.payoutDetails ? <span className="truncate font-mono text-white/75">{s.payoutDetails}</span> : <span className="text-amber-300/80">{t('noPayoutDetails')}</span>}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <a href={`tel:${s.ownerPhone || s.phone}`} className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white">
                <Phone className="h-3.5 w-3.5" />
                {s.ownerName ? `${s.ownerName} · ` : ''}{s.ownerPhone || s.phone}
              </a>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPlanFor(s)} className={buttonClasses({ size: 'sm' })}>
                  <Coins className="h-3.5 w-3.5" />
                  {t('assign')}
                </button>
                <button type="button" onClick={() => setHistoryFor(s)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15">
                  <History className="h-3.5 w-3.5" />
                  {t('history')}
                </button>
                <button type="button" onClick={() => setPayoutFor(s)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15">
                  <CreditCard className="h-3.5 w-3.5" />
                  {t('payoutDetails')}
                </button>
                <button type="button" disabled={busy === s.id} onClick={() => setVerifyFor(s)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {s.verified ? t('unverify') : t('verify')}
                </button>
              </div>
            </div>
          </Surface>
        ))}
      </div>
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={shops.length} total={meta?.total ?? 0} />

      <AssignPlanSheet shop={planFor} onClose={() => setPlanFor(null)} onDone={() => { setPlanFor(null); toast.show(t('toastPlan')); void reload(); }} onError={(m) => toast.show(m, 'err')} />
      <AdminLedgerSheet target={historyFor ? { title: t('historyTitle', { name: historyFor.name }), shopId: historyFor.id } : null} onClose={() => setHistoryFor(null)} />
      <PayoutDetailsSheet shop={payoutFor} onClose={() => setPayoutFor(null)} onDone={() => { setPayoutFor(null); toast.show(t('toastPayoutDetails')); void reload(); }} onError={(m) => toast.show(m, 'err')} />
      <ConfirmDialog
        open={Boolean(verifyFor)}
        onClose={() => setVerifyFor(null)}
        busy={Boolean(verifyFor && busy === verifyFor.id)}
        title={verifyFor?.verified ? t('unverify') : t('verify')}
        body={verifyFor ? (verifyFor.verified ? t('confirmUnverify', { name: verifyFor.name }) : t('confirmVerify', { name: verifyFor.name })) : null}
        confirmLabel={verifyFor?.verified ? t('unverify') : t('verify')}
        tone={verifyFor?.verified ? 'red' : 'green'}
        onConfirm={() => verifyFor && void toggleVerified(verifyFor)}
      />
    </div>
  );
}

function PayoutDetailsSheet({ shop, onClose, onDone, onError }: { shop: Shop | null; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const t = useTranslations('adm.shops');
  const tc = useTranslations('adm.common');
  const api = useAdminApi();
  const [value, setValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setValue(shop?.payoutDetails ?? ''), [shop]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setSaving(true);
    try {
      await api('/api/v1/admin/shops', { method: 'PATCH', body: JSON.stringify({ shopId: shop.id, payoutDetails: value.trim() }) });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet open={Boolean(shop)} onClose={onClose} title={shop ? t('payoutDetailsTitle', { name: shop.name }) : ''}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('fPayoutDetails')}>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} maxLength={300} placeholder={t('payoutDetailsPh')} className={`${fieldClass} resize-none font-mono`} />
        </Field>
        <p className="text-xs text-white/45">{t('payoutDetailsHint')}</p>
        <button type="submit" disabled={saving} className={buttonClasses({ size: 'md', fullWidth: true })}>
          {saving ? tc('saving') : t('save')}
        </button>
      </form>
    </Sheet>
  );
}

function AssignPlanSheet({ shop, onClose, onDone, onError }: { shop: Shop | null; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const t = useTranslations('adm.shops');
  const tc = useTranslations('adm.common');
  const { usd, nf } = useAdminFormat();
  const api = useAdminApi();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [plansState, setPlansState] = React.useState<'loading' | 'ok' | 'error'>('loading');
  const [planCode, setPlanCode] = React.useState('CUSTOM');
  const [credits, setCredits] = React.useState('0');
  const [days, setDays] = React.useState('30');
  const [paid, setPaid] = React.useState('');
  const [currency, setCurrency] = React.useState<'USD' | 'UZS' | 'AED' | 'EUR'>('UZS');
  const [method, setMethod] = React.useState<(typeof METHODS)[number]['id']>('BANK_TRANSFER');
  const [reference, setReference] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  // One id per opened form: a double click or a retry after a lost response grants credits once.
  const requestId = React.useRef(newRequestId());

  const pick = React.useCallback((code: string, list: Plan[]) => {
    setPlanCode(code);
    const p = list.find((x) => x.code === code);
    if (p) {
      setCredits(String(p.credits));
      setDays(String(p.durationDays));
    }
  }, []);

  React.useEffect(() => {
    if (!shop) return;
    requestId.current = newRequestId();
    setNotes('');
    setPaid('');
    setReference('');
    setPlansState('loading');
    let alive = true;
    fetch('/api/v1/plans', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d.success) throw new Error('plans');
        const list = (d.plans as Plan[]).filter((p) => p.code !== 'FREE_TRIAL');
        setPlans(list);
        setPlansState('ok');
        pick(list[0]?.code ?? 'CUSTOM', list);
      })
      .catch(() => {
        if (!alive) return;
        setPlans([]);
        setPlansState('error');
        setPlanCode('CUSTOM');
      });
    return () => {
      alive = false;
    };
  }, [shop, pick]);

  const plan = plans.find((p) => p.code === planCode);
  const paidNum = Number(paid.replace(/\s/g, '').replace(',', '.')) || 0;
  // Only USD can be compared with the plan price directly; other currencies are checked by the admin.
  const priceMismatch = plan && currency === 'USD' && paidNum > 0 && Math.abs(paidNum - plan.priceUSD) > 0.009;
  const willExtend = shop?.isPaid && shop.expiresAt;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    if (notes.trim().length < 3) return onError(t('errNotes'));
    const creditsNum = Math.max(0, Math.floor(Number(credits) || 0));
    if (creditsNum > 50000) return onError(t('errCredits'));
    setSaving(true);
    try {
      await api('/api/v1/admin/billing/assign-plan', {
        method: 'POST',
        body: JSON.stringify({
          shopId: shop.id,
          planCode,
          requestId: requestId.current,
          creditsToAdd: creditsNum,
          paidAmountMinor: Math.round(paidNum * 100),
          paymentCurrency: currency,
          paymentMethod: method,
          ...(reference.trim() ? { paymentReference: reference.trim() } : {}),
          durationDays: Math.min(365, Math.max(1, Math.floor(Number(days) || 30))),
          adminNotes: notes.trim(),
        }),
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('errAssign'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={Boolean(shop)} onClose={onClose} title={shop ? t('sheetTitle', { name: shop.name }) : t('sheetDefault')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('fPlan')}>
          <select value={planCode} onChange={(e) => pick(e.target.value, plans)} disabled={plansState === 'loading'} className={fieldClass}>
            {plans.map((p) => (
              <option key={p.code} value={p.code} className="bg-surface-1">{p.name} · {usd(p.priceUSD)} · {nf.format(p.credits)}</option>
            ))}
            <option value="CUSTOM" className="bg-surface-1">Custom</option>
          </select>
        </Field>
        {plansState === 'error' && <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('plansFailed')}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fCredits')}>
            <input type="number" inputMode="numeric" min={0} max={50000} value={credits} onChange={(e) => setCredits(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t('fDays')}>
            <input type="number" inputMode="numeric" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className={fieldClass} />
          </Field>
        </div>
        {willExtend && <p className="text-xs text-white/50">{t('extendHint', { date: dateTime(shop.expiresAt!) })}</p>}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t('fPaidAmount')}>
            <input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={fieldClass} />
          </Field>
          <Field label={t('fCurrency')}>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className={fieldClass}>
              {(['UZS', 'USD', 'AED', 'EUR'] as const).map((c) => <option key={c} value={c} className="bg-surface-1">{c}</option>)}
            </select>
          </Field>
        </div>
        {priceMismatch && <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('priceMismatch', { price: usd(plan!.priceUSD) })}</p>}
        {paidNum === 0 && <p className="text-xs text-amber-300/80">{t('zeroPaid')}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fMethod')}>
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={fieldClass}>
              {METHODS.map((m) => <option key={m.id} value={m.id} className="bg-surface-1">{t(m.label)}</option>)}
            </select>
          </Field>
          <Field label={t('fReference')}>
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} className={fieldClass} />
          </Field>
        </div>
        <Field label={t('fNotes')}>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder={t('notesPlaceholder')} className={`${fieldClass} resize-none`} />
        </Field>
        <p className="text-xs text-white/45">{t('info')}</p>
        <button type="submit" disabled={saving || plansState === 'loading'} className={buttonClasses({ size: 'md', fullWidth: true })}>
          {saving ? tc('saving') : t('submit')}
        </button>
      </form>
    </Sheet>
  );
}
