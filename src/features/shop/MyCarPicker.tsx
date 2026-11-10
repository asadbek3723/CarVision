'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Car, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { geist, md } from '@/features/minimal/theme';
import { useMyCar } from './useMyCar';

interface ModelResult {
  id: string;
  label: string;
}

type Step = 'model' | 'year';

const MIN_YEAR = 1950;
/** Quick picks in the year step: the latest model years, newest first. */
const QUICK_YEARS = 12;

/**
 * "My car": a banner under the search that opens a two-step dialog,
 * first the make and model, then the production year. The choice is kept on this device until the
 * customer changes or removes it, and filters the shop to parts that fit it.
 */
export function MyCarPicker() {
  const t = useTranslations('shop.myCar');
  const { car, setCar } = useMyCar();

  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>('model');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<ModelResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<ModelResult | null>(null);
  const [year, setYear] = React.useState('');

  const maxYear = new Date().getFullYear() + 1;
  const yearNumber = Number(year);
  const yearValid = /^\d{4}$/.test(year) && yearNumber >= MIN_YEAR && yearNumber <= maxYear;
  const quickYears = React.useMemo(() => Array.from({ length: QUICK_YEARS }, (_, i) => new Date().getFullYear() - i), []);

  const openDialog = () => {
    setStep('model');
    setQuery('');
    setResults([]);
    setPicked(null);
    setYear('');
    setOpen(true);
  };

  // Model search (only while the first step is showing).
  React.useEffect(() => {
    if (!open || step !== 'model') return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
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
      clearTimeout(timer);
    };
  }, [query, open, step]);

  const choose = (m: ModelResult) => {
    setPicked(m);
    setStep('year');
  };

  const save = (withYear: boolean) => {
    if (!picked || (withYear && !yearValid)) return;
    setCar({ modelId: picked.id, label: picked.label, year: withYear ? yearNumber : undefined });
    setOpen(false);
  };

  const quiet = 'text-[#8C8C8C] transition hover:text-white';

  return (
    <>
      {/* A banner: asks for the car, or shows the chosen one (name, year) with a way to change or remove it. */}
      <div
        className={`relative flex min-w-0 items-center gap-3.5 overflow-hidden rounded-[20px] border p-3.5 transition ${
          car ? `${md.line} ${md.card}` : 'border-[#FDC902]/25 bg-[linear-gradient(135deg,rgba(253,201,2,0.13),rgba(253,201,2,0.025)_70%)]'
        }`}
      >
        {!car && <span aria-hidden className="pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full bg-[#FDC902]/15 blur-2xl" />}
        <button
          type="button"
          onClick={openDialog}
          aria-label={car ? t('change') : t('chip')}
          className="group relative flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDC902]/60"
        >
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[14px] ${car ? 'bg-[#FDC902]/12 text-[#FDC902]' : 'bg-[#FDC902] text-[#0A0A0A]'}`}>
            <Car className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            {car ? (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[#8C8C8C]">{t('yourCar')}</span>
                  {car.year && <span className="shrink-0 rounded-full bg-[#FDC902]/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#FDC902]">{car.year}</span>}
                </span>
                <span className="mt-1 block truncate text-[16px] font-semibold leading-tight text-white">{car.label}</span>
              </>
            ) : (
              <>
                <span className="block text-[16px] font-semibold leading-tight text-white">{t('chip')}</span>
                <span className="mt-1 block text-[12.5px] leading-snug text-[#A8A8A8]">{t('hint')}</span>
              </>
            )}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#FDC902] transition group-hover:translate-x-0.5 rtl:rotate-180" />
        </button>
        {car && (
          <button type="button" onClick={() => setCar(null)} aria-label={t('removeCar')} className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] ${quiet}`}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={step === 'model' ? t('pickTitle') : t('yearTitle')}
        description={step === 'year' && picked ? t('yearSub', { car: picked.label }) : undefined}
        size="sm"
        className={`${geist.className} ${md.card}`}
        footer={
          step === 'year' ? (
            <>
              <button type="button" onClick={() => setStep('model')} className="me-auto inline-flex min-h-12 items-center gap-1 rounded-full px-4 text-sm font-semibold text-[#9A9A9A] transition hover:text-white">
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                {t('back')}
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                disabled={!yearValid}
                className={`inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-[#0A0A0A] transition disabled:opacity-40 ${md.accentBg}`}
              >
                {t('save')}
              </button>
            </>
          ) : undefined
        }
      >
        {/* Two thin bars show the step */}
        <div className="mb-4 flex gap-1.5" role="img" aria-label={t('stepOf', { step: step === 'model' ? 1 : 2, total: 2 })}>
          <span className="h-1 flex-1 rounded-full bg-[#FDC902]" />
          <span className={`h-1 flex-1 rounded-full transition-colors ${step === 'year' ? 'bg-[#FDC902]' : 'bg-[#2a2a2a]'}`} />
        </div>

        {step === 'model' ? (
          <div>
            <label className={`flex h-12 items-center gap-2.5 rounded-[14px] px-3.5 ${md.tile}`}>
              <Search className="h-[18px] w-[18px] shrink-0 text-[#6B6B6B]" />
              <input
                data-autofocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                autoComplete="off"
                enterKeyHint="search"
                className="w-full min-w-0 bg-transparent text-[14px] text-white outline-none placeholder:text-[#6B6B6B]"
              />
            </label>
            {query.trim().length >= 2 && (
              <div className="mt-2 max-h-64 overflow-y-auto overscroll-contain">
                {loading && <p className="px-1 py-3 text-xs text-[#9A9A9A]">{t('searching')}</p>}
                {!loading && results.length === 0 && <p className="px-1 py-3 text-xs text-[#9A9A9A]">{t('notFound')}</p>}
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => choose(r)}
                    className={`flex min-h-12 w-full items-center border-b px-1 text-start text-[15px] text-white transition last:border-b-0 hover:bg-white/[0.04] ${md.line}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <input
              data-autofocus
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save(true);
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder={t('yearPlaceholder')}
              aria-invalid={year.length === 4 && !yearValid}
              className={`h-14 w-full rounded-[14px] px-4 text-center text-[24px] font-semibold tabular-nums tracking-[0.05em] text-white outline-none placeholder:text-[#4a4a4a] focus:ring-2 focus:ring-[#FDC902]/50 ${md.tile}`}
            />
            {year.length === 4 && !yearValid && <p className="mt-2 text-center text-xs text-red-300">{t('yearInvalid', { max: maxYear })}</p>}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(String(y))}
                  aria-pressed={year === String(y)}
                  className={`h-10 rounded-full text-[13px] font-medium tabular-nums transition ${
                    year === String(y) ? `${md.accentBg} text-[#0A0A0A]` : `${md.tile} text-white hover:bg-[#2a2a2a]`
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => save(false)} className="mt-4 w-full py-2 text-center text-[13px] font-medium text-[#8C8C8C] transition hover:text-white">
              {t('skipYear')}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
