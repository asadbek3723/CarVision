'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Loader2, Search, Sparkles } from 'lucide-react';
import { useMyCar } from '@/features/shop/useMyCar';

type Phase = 'scan' | 'confirm' | 'manual' | 'year' | 'done';

interface Candidate {
  id: string;
  label: string;
}

interface CarIdentifyGateProps {
  /** Front photo of the car (data URL or same-origin path). */
  photo: string;
  onDone: () => void;
}

const MIN_YEAR = 1990;
const SCAN_HINTS = ['gtHint1', 'gtHint2', 'gtHint3'] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Shrinks the photo so the AI request stays fast and cheap. */
async function downscale(src: string, maxSide = 768): Promise<string | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}

/**
 * Step between "photos taken" and "pick parts":
 * 1. AI names the car  2. user confirms (or searches by hand)  3. user picks the year.
 * The year matters: a 1990 and a 2026 model of the same name rarely share body parts.
 */
export function CarIdentifyGate({ photo, onDone }: CarIdentifyGateProps) {
  const t = useTranslations('flow');
  const reduce = useReducedMotion();
  const { setCar } = useMyCar();
  const maxYear = React.useMemo(() => new Date().getFullYear(), []);

  const [phase, setPhase] = React.useState<Phase>('scan');
  const [hint, setHint] = React.useState(0);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [aiName, setAiName] = React.useState('');
  const [picked, setPicked] = React.useState<Candidate | null>(null);
  const [year, setYear] = React.useState(() => maxYear - 6);
  const [notice, setNotice] = React.useState('');

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Candidate[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Step 1: ask the AI (at least 2.4s so the scan animation never flashes by)
  React.useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const hintTimer = setInterval(() => setHint((h) => (h + 1) % SCAN_HINTS.length), 1100);

    (async () => {
      let found: { name: string; list: Candidate[] } | null = null;
      let reason = '';
      try {
        const small = await downscale(photo);
        if (small) {
          const res = await fetch('/api/v1/vehicles/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo: small }),
          });
          const data = await res.json().catch(() => ({}));
          if (data?.detected) {
            found = { name: `${data.make ?? ''} ${data.model ?? ''}`.trim(), list: (data.candidates ?? []) as Candidate[] };
          } else if (data?.reason === 'not_a_car') {
            reason = t('gtNoCar');
          }
        }
      } catch {
        // fall through to manual search
      }
      const wait = Math.max(0, 2400 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (cancelled) return;
      clearInterval(hintTimer);

      if (found && found.list.length > 0) {
        setAiName(found.name);
        setCandidates(found.list);
        setPicked(found.list[0]!);
        setPhase('confirm');
      } else {
        if (found) setQuery(found.name);
        setNotice(reason || t('gtAutoFail'));
        setPhase('manual');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(hintTimer);
    };
  }, [photo, t]);

  // Manual search (debounced)
  React.useEffect(() => {
    const q = query.trim();
    if (phase !== 'manual' || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/catalog/vehicles?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled && data.success) setResults((data.models ?? []).slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, phase]);

  const finish = React.useCallback(() => {
    if (!picked) return;
    setCar({ modelId: picked.id, label: picked.label, year });
    setPhase('done');
    setTimeout(onDone, reduce ? 200 : 1100);
  }, [picked, year, setCar, onDone, reduce]);

  const fade = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -16, filter: 'blur(6px)' },
    transition: { duration: 0.5, ease: EASE },
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t('gtDialog')} className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#07080C] px-5 py-8">
      {/* Ambient backdrop: blurred photo + gold glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <img src={photo} alt="" className="h-full w-full scale-110 object-cover opacity-[0.18] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(212,174,98,0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080C]/40 via-[#07080C]/80 to-[#07080C]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Photo frame, always visible */}
        <motion.div
          layout
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative mx-auto aspect-[16/10] w-full overflow-hidden rounded-[28px] bg-[#0B0D13] shadow-[0_30px_90px_rgba(0,0,0,0.8)]"
        >
          <img src={photo} alt={t('gtYourCar')} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

          {/* Gold viewfinder corners */}
          {(['start-3 top-3 border-s-2 border-t-2 rounded-tl-xl', 'end-3 top-3 border-e-2 border-t-2 rounded-tr-xl', 'start-3 bottom-3 border-s-2 border-b-2 rounded-bl-xl', 'end-3 bottom-3 border-e-2 border-b-2 rounded-br-xl'] as const).map((c) => (
            <motion.span
              key={c}
              aria-hidden
              initial={reduce ? false : { opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
              className={`absolute h-7 w-7 border-[#D4AE62] ${c}`}
            />
          ))}

          {phase === 'scan' && !reduce && (
            <>
              <motion.div
                aria-hidden
                className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-[#D4AE62]/25 to-transparent"
                initial={{ top: '-30%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 1.7, ease: 'easeInOut', repeat: Infinity }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-x-0 h-px bg-[#D4AE62] shadow-[0_0_18px_3px_rgba(212,174,98,0.8)]"
                initial={{ top: '-5%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 1.7, ease: 'easeInOut', repeat: Infinity }}
              />
            </>
          )}

          {phase === 'done' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
              <motion.div
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="grid h-20 w-20 place-items-center rounded-full bg-gold-gradient text-black shadow-[0_0_60px_rgba(212,174,98,0.55)]"
              >
                <Check className="h-10 w-10" strokeWidth={3} />
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Phase content */}
        <div className="relative mt-8 min-h-[250px]" aria-live="polite">
          <AnimatePresence mode="wait">
            {phase === 'scan' && (
              <motion.div key="scan" {...fade} className="text-center">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AE62]">
                  <Sparkles className="h-3.5 w-3.5" /> AI
                </p>
                <h2 className="mt-3 font-display text-2xl font-light text-white">{t('gtDetecting')}</h2>
                <AnimatePresence mode="wait">
                  <motion.p key={hint} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="mt-2 text-sm text-white/55">
                    {t(SCAN_HINTS[hint]!)}
                  </motion.p>
                </AnimatePresence>
                <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full w-1/3 rounded-full bg-gold-gradient" animate={reduce ? { x: '100%' } : { x: ['-100%', '300%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }} />
                </div>
              </motion.div>
            )}

            {phase === 'confirm' && picked && (
              <motion.div key="confirm" {...fade} className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">{t('gtIsThis')}</p>
                <h2 className="mt-3 font-display text-3xl font-light leading-tight text-white md:text-4xl">
                  <span className="text-gold-gradient">{picked.label}</span>
                </h2>
                {candidates.length > 1 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPicked(c)}
                        className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs transition ${c.id === picked.id ? 'bg-[#D4AE62] font-semibold text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12]'}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-8 grid gap-3">
                  <button type="button" onClick={() => setPhase('year')} className="shimmer inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gold-gradient text-sm font-bold uppercase tracking-wider text-black shadow-[0_14px_40px_rgba(212,174,98,0.3)] transition hover:brightness-110 active:scale-[0.98]">
                    {t('gtYes')} <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(aiName);
                      setNotice('');
                      setPhase('manual');
                    }}
                    className="h-12 cursor-pointer rounded-2xl text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {t('gtNo')}
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 'manual' && (
              <motion.div key="manual" {...fade}>
                <h2 className="text-center font-display text-2xl font-light text-white">{t('gtChoose')}</h2>
                {notice && <p className="mt-2 text-center text-sm text-white/55">{notice}</p>}
                <div className="relative mt-5">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Masalan: Cobalt, Toyota Camry, BYD Song"
                    aria-label={t('gtCarName')}
                    className="h-14 w-full rounded-2xl bg-white/[0.06] ps-11 pe-4 text-base text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/30 focus:ring-[#D4AE62]/60"
                  />
                </div>
                <div className="mt-3 max-h-60 overflow-y-auto rounded-2xl">
                  {searching && (
                    <p className="flex items-center gap-2 px-2 py-3 text-xs text-white/50">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Qidirilmoqda…
                    </p>
                  )}
                  {!searching && query.trim().length >= 2 && results.length === 0 && <p className="px-2 py-3 text-sm text-white/50">{t('gtNotFound')}</p>}
                  {results.map((r, i) => (
                    <motion.button
                      key={r.id}
                      type="button"
                      initial={reduce ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      onClick={() => {
                        setPicked(r);
                        setPhase('year');
                      }}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3.5 text-start text-sm text-white/90 transition hover:bg-white/[0.07]"
                    >
                      {r.label}
                      <ChevronRight className="h-4 w-4 text-[#D4AE62]" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === 'year' && picked && (
              <motion.div key="year" {...fade} className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">{picked.label}</p>
                <h2 className="mt-2 font-display text-xl font-light text-white">{t('gtWhichYear')}</h2>
                <div className="relative mt-4 h-20 overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={year}
                      initial={reduce ? false : { y: 28, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { y: -28, opacity: 0 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="absolute inset-0 font-display text-6xl font-extralight tabular-nums text-gold-gradient"
                    >
                      {year}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <input
                  type="range"
                  min={MIN_YEAR}
                  max={maxYear}
                  step={1}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  aria-label={t('gtYearLabel')}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#D4AE62]"
                />
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/35">
                  <span>{MIN_YEAR}</span>
                  <span>{maxYear}</span>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[maxYear, maxYear - 3, maxYear - 6, maxYear - 10, maxYear - 15].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYear(y)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs tabular-nums transition ${year === y ? 'bg-[#D4AE62] font-semibold text-black' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12]'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={finish} className="shimmer mt-7 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gold-gradient text-sm font-bold uppercase tracking-wider text-black shadow-[0_14px_40px_rgba(212,174,98,0.3)] transition hover:brightness-110 active:scale-[0.98]">
                  {t('gtShowParts')} <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {phase === 'done' && picked && (
              <motion.div key="done" {...fade} className="text-center">
                <h2 className="font-display text-2xl font-light text-white">
                  {picked.label} <span className="text-[#D4AE62]">· {year}</span>
                </h2>
                <p className="mt-2 text-sm text-white/55">{t('gtPreparing')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
