'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useApiError } from '@/lib/api-error';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, RefreshCw, X } from 'lucide-react';
import type { AngleState } from './render-plan';
import type { RenderFatal } from './useRenderBuild';
import { buttonClasses } from '@/components/ui';

interface Props {
  states: AngleState[];
  running: boolean;
  fatal: RenderFatal | null;
  percent: number;
  /** The customer's own photo, blurred behind the animation. */
  backdrop?: string | undefined;
  locale: string;
  demo?: boolean | undefined;
  onRetry: (angleId: string) => void | Promise<void>;
  onContinue: () => void;
  onClose: () => void;
}

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5'] as const;

/**
 * The real progress only moves in big steps (one per finished side). Shown alone it jumps
 * 0 -> 20 -> 40 and looks frozen in between, so the counter creeps up one percent at a time
 * towards (never past) the end of the side being drawn, and catches up quickly when a side
 * really finishes. It never shows 100 before the work is done.
 */
function useSmoothPercent(real: number, running: boolean, sides: number): number {
  const [shown, setShown] = React.useState(real);
  const valueRef = React.useRef(real);
  React.useEffect(() => {
    const step = 100 / Math.max(sides, 1);
    const timer = setInterval(() => {
      const v = valueRef.current;
      const ceiling = running ? Math.min(99, real + step * 0.92) : real;
      let next = v;
      if (v < real) next = v + Math.max(1, (real - v) * 0.3); // a side finished: catch up fast
      else if (v < ceiling) next = v + Math.max(0.08, (ceiling - v) * 0.025); // waiting: slow creep
      else if (!running && v > real) next = real;
      next = Math.min(next, running ? ceiling : real);
      if (next !== v) {
        valueRef.current = next;
        setShown(Math.floor(next));
      }
    }, 120);
    return () => clearInterval(timer);
  }, [real, running, sides]);
  return shown;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Full-screen render progress: the customer's photo under a slow scan line, one quiet row per car side, honest states (no fake results). */
export function RenderProgress({ states, running, fatal, percent, backdrop, locale, demo, onRetry, onContinue, onClose }: Props) {
  const t = useTranslations('render');
  const apiError = useApiError();
  const reduce = useReducedMotion();
  const [stage, setStage] = React.useState(0);
  const done = states.filter((s) => s.status === 'done').length;
  const failed = states.filter((s) => s.status === 'failed');
  const [retrying, setRetrying] = React.useState(false);
  const shown = useSmoothPercent(percent, running, states.length);

  // While this full-screen view is open the page behind it must not move or rubber-band.
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, body.style.overscrollBehavior];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, body.style.overscrollBehavior] = prev as [string, string, string, string];
    };
  }, []);
  // One after another: the server allows only a few renders in flight per user.
  const retryAll = async () => {
    setRetrying(true);
    try {
      for (const f of failed) await onRetry(f.id);
    } finally {
      setRetrying(false);
    }
  };

  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setStage((n) => (n + 1) % STAGES.length), 2600);
    return () => clearInterval(timer);
  }, [running]);

  const statusText = fatal ? t('stopped') : running ? t(STAGES[stage] ?? 'stage1') : failed.length && !done ? t('noneReady') : failed.length ? t('someFailed') : t('allReady');

  return (
    <div role="dialog" aria-modal="true" aria-label={t('dialog')} className="fixed inset-0 z-[90] flex flex-col overflow-y-auto overflow-x-hidden overscroll-none bg-[#07080B]">
      {backdrop && <div className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-[0.18] blur-3xl" style={{ backgroundImage: `url(${backdrop})` }} aria-hidden />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,191,116,0.06),transparent_60%)]" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-10 md:py-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/70">
          Car<span className="text-gold-500">Vision</span>
        </span>
        {!running && (
          <button type="button" onClick={onClose} aria-label={t('close')} className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 content-center gap-8 px-5 pb-10 md:px-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        {/* Photo under a slow scan line */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-surface-1 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
          {backdrop && <img src={backdrop} alt="" className={`h-full w-full object-cover transition duration-700 ${running ? 'opacity-60 saturate-[0.8]' : 'opacity-90'}`} />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080B]/70 via-transparent to-[#07080B]/20" aria-hidden />
          {running && !reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-px bg-[#E8CB86] shadow-[0_0_24px_6px_rgba(232,191,116,0.45)]"
              initial={{ top: '4%' }}
              animate={{ top: ['4%', '96%', '4%'] }}
              transition={{ duration: 5.5, ease: 'easeInOut', repeat: Infinity }}
            />
          )}
          {/* Corner marks */}
          {['start-4 top-4 border-s border-t rounded-tl-md', 'end-4 top-4 border-e border-t rounded-tr-md', 'start-4 bottom-4 border-s border-b rounded-bl-md', 'end-4 bottom-4 border-e border-b rounded-br-md'].map((c) => (
            <span key={c} aria-hidden className={`pointer-events-none absolute h-5 w-5 ${c}`} />
          ))}
        </div>

        {/* Status panel */}
        <div className="flex flex-col">
          <div className="flex items-end justify-between gap-4">
            <p className="text-6xl font-extralight leading-none tabular-nums text-white md:text-7xl">
              {shown}
              <span className="ms-1 text-2xl text-gold-500">%</span>
            </p>
            {demo && <span className="mb-1 rounded-full bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200">{t('demoNotice')}</span>}
          </div>

          <div className="mt-5 h-px w-full overflow-hidden bg-white/10" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-gradient-to-r from-gold-500 to-[#F1D790] transition-[width] duration-200 ease-linear" style={{ width: `${shown}%` }} />
          </div>

          <div className="mt-5 min-h-[3.25rem]" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p
                key={running ? stage : fatal ? 'fatal' : 'done'}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="text-lg font-medium text-white"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>
            {running && <p className="mt-1 text-xs text-white/40">{t('keepOpen')}</p>}
          </div>

          {/* One quiet row per car side */}
          <ul className="mt-4 divide-y divide-white/[0.06] " aria-label={t('angles')}>
            {states.map((s) => (
              <li key={s.id} className="flex items-center gap-3.5 py-3">
                <span
                  className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
 s.status === 'done' ? 'border-gold-500 bg-gold-500 text-black' : s.status === 'failed' ? 'border-red-400/60 text-red-300' : s.status === 'rendering' ? '' : ''
 }`}
                >
                  {s.status === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {s.status === 'failed' && <AlertTriangle className="h-3 w-3" />}
                  {s.status === 'rendering' && (
                    <span aria-hidden className={`absolute -inset-px rounded-full border border-transparent border-t-gold-500 ${reduce ? '' : 'animate-spin'}`} style={{ animationDuration: '1.2s' }} />
                  )}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm transition-colors ${s.status === 'queued' || s.status === 'skipped' ? 'text-white/40' : 'text-white'}`}>{s.label}</span>
                {s.skipReason === 'not-visible' && <span className="shrink-0 text-xs text-white/35">{t('skippedHidden')}</span>}
              </li>
            ))}
          </ul>

          {/* Problems and actions */}
          {fatal && (
            <div role="alert" className="mt-5 rounded-2xl bg-red-500/[0.07] p-4">
              <p className="text-sm text-red-200">{apiError({ code: fatal.code, error: fatal.message }, t('errorFallback'))}</p>
              {(fatal.code === 'INSUFFICIENT_CREDITS' || fatal.code === 'PLAN_EXPIRED') && (
                <Link href={`/${locale}/plans`} className={buttonClasses({ size: 'sm', className: 'mt-3' })}>
                  {t('viewPlans')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              )}
              {fatal.code === 'UNAUTHENTICATED' && (
                <Link href={`/${locale}/login`} className={buttonClasses({ size: 'sm', className: 'mt-3' })}>{t('login')}</Link>
              )}
            </div>
          )}

          {/* Failed sides are already marked in the list; one action retries them all. */}
          {!running && failed.length > 0 && !fatal && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void retryAll()}
              className={buttonClasses({ variant: 'gold', size: 'lg', fullWidth: true, className: 'mt-5 gap-2.5 px-5' })}
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${retrying && !reduce ? 'animate-spin' : ''}`} />
              <span className="min-w-0 truncate whitespace-nowrap">{t('retryAll', { count: failed.length })}</span>
            </button>
          )}

          {!running && done > 0 && (
            <button type="button" onClick={onContinue} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#E2BF78] to-[#C79F4E] text-base font-bold text-black shadow-[0_10px_30px_-8px_rgba(232,191,116,0.55)] transition hover:brightness-105 active:scale-[0.98]">
              {t('viewResult')}
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
