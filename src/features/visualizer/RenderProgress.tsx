'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import type { AngleState } from './render-plan';
import type { RenderFatal } from './useRenderBuild';

interface Props {
  states: AngleState[];
  running: boolean;
  fatal: RenderFatal | null;
  percent: number;
  /** The customer's own photo, blurred behind the animation. */
  backdrop?: string | undefined;
  locale: string;
  demo?: boolean | undefined;
  onRetry: (angleId: string) => void;
  onContinue: () => void;
  onClose: () => void;
}

const STAGES = ['rpStage1', 'rpStage2', 'rpStage3', 'rpStage4', 'rpStage5'] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

/** Full-screen render progress: one ring per car side, a scan beam, honest states (no fake results). */
export function RenderProgress({ states, running, fatal, percent, backdrop, locale, demo, onRetry, onContinue, onClose }: Props) {
  const tx = useTranslations('studio');
  const reduce = useReducedMotion();
  const [stage, setStage] = React.useState(0);
  const done = states.filter((s) => s.status === 'done').length;
  const failed = states.filter((s) => s.status === 'failed');

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((n) => (n + 1) % STAGES.length), 2600);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Render jarayoni" className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#07080B]">
      {backdrop && <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-2xl" style={{ backgroundImage: `url(${backdrop})` }} aria-hidden />}
      <div className="absolute inset-0 bg-gradient-to-b from-[#07080B]/60 via-[#07080B]/80 to-[#07080B]" aria-hidden />

      <header className="relative z-10 flex items-center justify-between p-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AE62]">
          <Sparkles className="h-4 w-4" />
          CarVision AI
        </span>
        {!running && (
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 pb-8">
        {/* Hero: photo with scanning beam */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[28px] bg-black/60 shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
          {backdrop && <img src={backdrop} alt="" className="h-full w-full object-cover opacity-80" />}
          {running && !reduce && (
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[#D4AE62]/45 to-transparent"
              initial={{ insetInlineStart: '-20%' }}
              animate={{ insetInlineStart: '110%' }}
              transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-5">
            <p className="text-5xl font-extralight tabular-nums text-white">{percent}<span className="text-2xl text-white/50">%</span></p>
          </div>
        </div>

        {/* Stage text */}
        <div className="mt-6 h-12 text-center" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={running ? stage : fatal ? 'fatal' : 'done'}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -8 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="text-base text-white/85"
            >
              {fatal ? tx('rpStopped') : running ? tx(STAGES[stage]!) : failed.length && !done ? tx('rpNone') : failed.length ? tx('rpSome') : tx('rpAll')}
            </motion.p>
          </AnimatePresence>
          {running && <p className="mt-1 text-xs text-white/40">{tx('rpDontClose')}</p>}
        </div>

        {/* Angle chips */}
        <ul className="mt-2 grid w-full grid-cols-5 gap-2" aria-label={tx('rpAngles')}>
          {states.map((s) => (
            <li key={s.id} className="flex flex-col items-center gap-2">
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                  s.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' : s.status === 'failed' ? 'bg-red-500/20 text-red-300' : s.status === 'rendering' ? 'bg-[#D4AE62]/20 text-[#D4AE62]' : 'bg-white/[0.06] text-white/35'
                }`}
              >
                {s.status === 'done' && <Check className="h-6 w-6" />}
                {s.status === 'failed' && <AlertTriangle className="h-5 w-5" />}
                {s.status === 'rendering' && <Loader2 className="h-6 w-6 animate-spin" />}
                {(s.status === 'queued' || s.status === 'skipped') && <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <span className="line-clamp-2 text-center text-[11px] leading-tight text-white/60">{s.label}</span>
            </li>
          ))}
        </ul>

        {/* Overall bar */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#D4AE62] to-[#F1D790]" animate={{ width: `${percent}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>

        {demo && <p className="mt-4 rounded-full bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200">{tx('rpDemo')}</p>}

        {/* Problems and actions */}
        {fatal && (
          <div role="alert" className="mt-5 w-full rounded-2xl bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-200">{fatal.message}</p>
            {(fatal.code === 'INSUFFICIENT_CREDITS' || fatal.code === 'PLAN_EXPIRED') && (
              <Link href={`/${locale}/plans`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#D4AE62] px-6 py-3 text-sm font-bold text-black">
                {tx('viewPlans')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            )}
            {fatal.code === 'UNAUTHENTICATED' && (
              <Link href={`/${locale}/login`} className="mt-3 inline-flex rounded-full bg-[#D4AE62] px-6 py-3 text-sm font-bold text-black">{tx('login')}</Link>
            )}
          </div>
        )}

        {!running && failed.length > 0 && !fatal && (
          <div className="mt-5 w-full space-y-2">
            {failed.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] px-4 py-3">
                <span className="min-w-0 text-sm text-white/80">{f.label}: <span className="text-red-300">{f.error || tx('rpError')}</span></span>
                <button type="button" onClick={() => onRetry(f.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {tx('rpRetry')}
                </button>
              </div>
            ))}
            <p className="text-center text-[11px] text-white/40">{tx('rpRefunded')}</p>
          </div>
        )}

        {!running && done > 0 && (
          <button type="button" onClick={onContinue} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AE62] py-4 text-base font-bold text-black shadow-[0_12px_40px_rgba(212,174,98,0.3)] transition hover:brightness-110 active:scale-[0.98]">
            Natijani ko‘rish ({done} ta rakurs)
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </button>
        )}
      </main>
    </div>
  );
}
