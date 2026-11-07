'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Car, Search, X } from 'lucide-react';
import { useMyCar } from './useMyCar';

interface ModelResult {
  id: string;
  label: string;
}

/** "My car" chip + search. Picking a car filters the shop to parts that fit it. */
export function MyCarPicker() {
  const t = useTranslations('shop.myCar');
  const { car, setCar } = useMyCar();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<ModelResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [year, setYear] = React.useState('');

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

  if (car && !open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* One pill: tap the car to change it, the cross to clear it */}
        <span className="inline-flex min-w-0 max-w-full items-center rounded-full bg-gold-500/10 text-gold-300">
          <button type="button" onClick={() => setOpen(true)} aria-label={t('change')} className="inline-flex min-h-9 min-w-0 items-center gap-2 ps-3.5 pe-2 text-[13px] font-semibold">
            <Car className="h-4 w-4 shrink-0" />
            <span className="truncate">{car.label}{car.year ? ` · ${car.year}` : ''}</span>
          </button>
          <button type="button" aria-label={t('removeCar')} onClick={() => setCar(null)} className="me-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-gold-300/80 transition hover:bg-gold-500/15 hover:text-gold-300">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-2 rounded-full ps-1 pe-3 text-[13px] font-semibold text-white/80 transition hover:bg-white/[0.06]">
        <Car className="h-4 w-4 text-gold-500" />
        {t('chip')}
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{t('pickTitle')}</p>
        <button type="button" aria-label={t('close')} onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-xl bg-white/[0.04] py-2.5 ps-9 pe-3 text-sm text-white outline-none placeholder:text-white/35 "
        />
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={1950}
        max={2100}
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder={t('yearPlaceholder')}
        className="mt-2 w-full rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 "
      />
      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl ">
          {loading && <p className="px-3 py-3 text-xs text-white/50">{t('searching')}</p>}
          {!loading && results.length === 0 && <p className="px-3 py-3 text-xs text-white/50">{t('notFound')}</p>}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                const y = Number(year);
                setCar({ modelId: r.id, label: r.label, year: y >= 1950 && y <= 2100 ? y : undefined });
                setOpen(false);
                setQuery('');
              }}
              className="block w-full px-3 py-2.5 text-start text-sm text-white/90 transition hover:bg-white/[0.06]"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
