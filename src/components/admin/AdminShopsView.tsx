'use client';

import * as React from 'react';
import { BadgeCheck, Coins, MapPin, Phone } from 'lucide-react';
import { EmptyState, ErrorState, Field, PLAN_LABEL, PageHeader, Pill, SearchField, Segmented, Sheet, Spinner, Surface, dateTime, fieldClass, nf, useAdminApi, useAdminData, useToast } from './ui';

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

const METHODS = [
  { id: 'BANK_TRANSFER', label: 'Bank o‘tkazmasi' },
  { id: 'CASH', label: 'Naqd' },
  { id: 'CLICK_PAYME_MANUAL', label: 'Click / Payme' },
  { id: 'OCTO', label: 'Octo' },
] as const;

export function AdminShopsView() {
  const { data, error, loading, reload } = useAdminData<{ shops: Shop[] }>('/api/v1/admin/shops');
  const api = useAdminApi();
  const toast = useToast();
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('all');
  const [planFor, setPlanFor] = React.useState<Shop | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const shops = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.shops ?? []).filter((s) => {
      if (filter === 'paid' && !s.isPaid) return false;
      if (filter === 'free' && s.isPaid) return false;
      if (filter === 'unverified' && s.verified) return false;
      if (!needle) return true;
      return `${s.name} ${s.ownerName} ${s.ownerPhone} ${s.phone} ${s.city} ${s.district}`.toLowerCase().includes(needle);
    });
  }, [data, q, filter]);

  const counts = React.useMemo(() => {
    const all = data?.shops ?? [];
    return { all: all.length, paid: all.filter((s) => s.isPaid).length, free: all.filter((s) => !s.isPaid).length, unverified: all.filter((s) => !s.verified).length };
  }, [data]);

  const toggleVerified = async (s: Shop) => {
    setBusy(s.id);
    try {
      await api('/api/v1/admin/shops', { method: 'PATCH', body: JSON.stringify({ shopId: s.id, verified: !s.verified }) });
      toast.show(s.verified ? 'Tasdiq olib tashlandi' : 'Ustaxona tasdiqlandi');
      await reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Xatolik', 'err');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      {toast.node}
      <PageHeader title="Ustaxonalar" subtitle={`${counts.all} ta ustaxona`} />
      <div className="space-y-3">
        <SearchField value={q} onChange={setQ} placeholder="Nomi, ega, telefon yoki shahar" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'Hammasi', count: counts.all },
            { id: 'paid', label: 'Pullik', count: counts.paid },
            { id: 'free', label: 'Free', count: counts.free },
            { id: 'unverified', label: 'Tasdiqlanmagan', count: counts.unverified },
          ]}
        />
      </div>

      <div className="mt-5 space-y-3">
        {shops.length === 0 && <EmptyState>Mos ustaxona topilmadi.</EmptyState>}
        {shops.map((s) => (
          <Surface key={s.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-white">{s.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50"><MapPin className="h-3.5 w-3.5 shrink-0" />{s.city}{s.district && s.district !== '-' ? `, ${s.district}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone={s.isPaid ? 'gold' : 'neutral'}>{PLAN_LABEL[s.plan] ?? s.plan}</Pill>
                {s.verified ? <Pill tone="green">Tasdiqlangan</Pill> : <Pill tone="amber">Tasdiqlanmagan</Pill>}
                {s.banned && <Pill tone="red">Bloklangan</Pill>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.04] py-3">
                <p className="text-lg font-bold tabular-nums text-white">{nf.format(s.credits)}</p>
                <p className="text-[10px] text-white/45">kredit</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] py-3">
                <p className="text-lg font-bold tabular-nums text-white">{s.items}</p>
                <p className="text-[10px] text-white/45">detal</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] py-3">
                <p className="text-xs font-bold text-white">{s.isPaid && s.expiresAt ? dateTime(s.expiresAt) : '—'}</p>
                <p className="text-[10px] text-white/45">tarif tugaydi</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <a href={`tel:${s.ownerPhone || s.phone}`} className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white">
                <Phone className="h-3.5 w-3.5" />
                {s.ownerName ? `${s.ownerName} · ` : ''}{s.ownerPhone || s.phone}
              </a>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPlanFor(s)} className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AE62] px-4 py-2.5 text-xs font-bold text-black hover:brightness-110">
                  <Coins className="h-3.5 w-3.5" />
                  Tarif berish
                </button>
                <button type="button" disabled={busy === s.id} onClick={() => void toggleVerified(s)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {s.verified ? 'Tasdiqni olish' : 'Tasdiqlash'}
                </button>
              </div>
            </div>
          </Surface>
        ))}
      </div>

      <AssignPlanSheet shop={planFor} onClose={() => setPlanFor(null)} onDone={() => { setPlanFor(null); toast.show('Tarif berildi'); void reload(); }} onError={(m) => toast.show(m, 'err')} />
    </div>
  );
}

function AssignPlanSheet({ shop, onClose, onDone, onError }: { shop: Shop | null; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const api = useAdminApi();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [planCode, setPlanCode] = React.useState('PRO_800');
  const [credits, setCredits] = React.useState('800');
  const [days, setDays] = React.useState('30');
  const [paid, setPaid] = React.useState('');
  const [currency, setCurrency] = React.useState<'USD' | 'UZS' | 'AED' | 'EUR'>('UZS');
  const [method, setMethod] = React.useState<(typeof METHODS)[number]['id']>('BANK_TRANSFER');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!shop) return;
    fetch('/api/v1/plans').then((r) => r.json()).then((d) => d.success && setPlans(d.plans.filter((p: Plan) => p.code !== 'FREE_TRIAL'))).catch(() => undefined);
    setNotes('');
    setPaid('');
  }, [shop]);

  const pick = (code: string) => {
    setPlanCode(code);
    const p = plans.find((x) => x.code === code);
    if (p) {
      setCredits(String(p.credits));
      setDays(String(p.durationDays));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    const paidNum = Number(paid.replace(/\s/g, '')) || 0;
    if (notes.trim().length < 3) return onError('Izohni yozing (kim, qachon, qanday to‘lagan)');
    setSaving(true);
    try {
      await api('/api/v1/admin/billing/assign-plan', {
        method: 'POST',
        body: JSON.stringify({
          shopId: shop.id,
          planCode,
          creditsToAdd: Math.max(1, Math.floor(Number(credits) || 0)),
          paidAmountCents: Math.round(paidNum * 100),
          paymentCurrency: currency,
          paymentMethod: method,
          durationDays: Math.max(1, Math.floor(Number(days) || 30)),
          adminNotes: notes.trim(),
        }),
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Tarif berib bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={Boolean(shop)} onClose={onClose} title={shop ? `Tarif: ${shop.name}` : 'Tarif'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tarif">
          <select value={planCode} onChange={(e) => pick(e.target.value)} className={fieldClass}>
            {plans.map((p) => (
              <option key={p.code} value={p.code} className="bg-[#101218]">{p.name} · ${p.priceUSD}</option>
            ))}
            <option value="CUSTOM" className="bg-[#101218]">Custom</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kredit">
            <input type="number" inputMode="numeric" min={1} max={50000} value={credits} onChange={(e) => setCredits(e.target.value)} className={fieldClass} />
          </Field>
          <Field label="Muddat (kun)">
            <input type="number" inputMode="numeric" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className={fieldClass} />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="To‘langan summa">
            <input type="number" inputMode="decimal" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className={fieldClass} />
          </Field>
          <Field label="Valyuta">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className={fieldClass}>
              {(['UZS', 'USD', 'AED', 'EUR'] as const).map((c) => <option key={c} value={c} className="bg-[#101218]">{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="To‘lov usuli">
          <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={fieldClass}>
            {METHODS.map((m) => <option key={m.id} value={m.id} className="bg-[#101218]">{m.label}</option>)}
          </select>
        </Field>
        <Field label="Izoh (majburiy)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Masalan: 4 noyabr, Click orqali 350 000 so‘m" className={`${fieldClass} resize-none`} />
        </Field>
        <p className="text-xs text-white/45">Kredit ustaxona balansiga qo‘shiladi, muddat hozirdan boshlab hisoblanadi. Amal audit logga yoziladi.</p>
        <button type="submit" disabled={saving} className="w-full rounded-full bg-[#D4AE62] py-3.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60">
          {saving ? 'Saqlanmoqda…' : 'Tarifni faollashtirish'}
        </button>
      </form>
    </Sheet>
  );
}

