'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, X } from 'lucide-react';

export interface PickedVehicle {
  key: string;
  modelId?: string | undefined;
  customModel?: string | undefined;
  label: string;
  yearFrom?: number | undefined;
  yearTo?: number | undefined;
}

interface ModelResult {
  id: string;
  label: string;
}

interface Props {
  value: PickedVehicle[];
  onChange: (next: PickedVehicle[]) => void;
}

const inputCls =
  'w-full rounded-xl  bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none ';

/** Searchable picker over the full vehicle database, with per-vehicle year range. */
export function VehiclePicker({ value, onChange }: Props) {
  const t = useTranslations('vehiclePicker');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<ModelResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [custom, setCustom] = React.useState('');

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/catalog/vehicles?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled && data.success) setResults(data.models ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const add = (v: PickedVehicle) => {
    if (value.some((x) => x.key === v.key)) return;
    onChange([...value, v]);
  };

  const patch = (key: string, p: Partial<PickedVehicle>) =>
    onChange(value.map((v) => (v.key === key ? { ...v, ...p } : v)));

  const yearInput = (key: string, field: 'yearFrom' | 'yearTo', current: number | undefined, placeholder: string) => (
    <input
      type="number"
      inputMode="numeric"
      min={1950}
      max={2100}
      value={current ?? ''}
      placeholder={placeholder}
      onChange={(e) => patch(key, { [field]: e.target.value ? Number(e.target.value) : undefined })}
      className="w-20 rounded-lg bg-white/[0.04] px-2 py-1.5 text-center text-xs text-white outline-none "
    />
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search')}
          className={`${inputCls} ps-9`}
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-56 overflow-y-auto rounded-xl bg-[#0B0D13]">
          {loading && <p className="px-3 py-3 text-xs text-white/50">{t('searching')}</p>}
          {!loading && results.length === 0 && <p className="px-3 py-3 text-xs text-white/50">{t('notFound')}</p>}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                add({ key: r.id, modelId: r.id, label: r.label });
                setQuery('');
              }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-start text-sm text-white/90 transition hover:bg-white/[0.06]"
            >
              <span>{r.label}</span>
              <Plus className="h-4 w-4 text-gold-500" />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={t('custom')}
          className={inputCls}
        />
        <button
          type="button"
          disabled={custom.trim().length < 2}
          onClick={() => {
            const name = custom.trim();
            add({ key: `custom:${name.toLowerCase()}`, customModel: name, label: name });
            setCustom('');
          }}
          className="shrink-0 rounded-xl bg-white/[0.08] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.14] disabled:opacity-40"
        >
          {t('add')}
        </button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((v) => (
            <li key={v.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-gold-500/[0.07] px-3 py-2">
              <span className="me-auto text-sm font-semibold text-white">{v.label}</span>
              <span className="text-[11px] text-white/45">{t('year')}</span>
              {yearInput(v.key, 'yearFrom', v.yearFrom, t('from'))}
              <span className="text-white/30">–</span>
              {yearInput(v.key, 'yearTo', v.yearTo, t('to'))}
              <button
                type="button"
                aria-label={t('remove')}
                onClick={() => onChange(value.filter((x) => x.key !== v.key))}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
