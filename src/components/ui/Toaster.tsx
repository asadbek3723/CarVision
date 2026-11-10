'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { vibrate } from '@/features/camera/lib/fx';

/**
 * Notifications that slide in from the top of the screen (below the notch), like a native app,
 * instead of red boxes pushed into the page. `toast.error('…')` from anywhere, e.g. after a failed
 * request; screens with an `error` string use `useErrorToast(error)`. Tap or swipe up to dismiss;
 * they also leave by themselves.
 */
type Kind = 'error' | 'success' | 'info';
interface Item {
  id: number;
  kind: Kind;
  message: string;
}

let items: Item[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(kind: Kind, message: string): void {
  const text = message.trim();
  if (!text) return;
  // The same message twice in a row (a double tap on a failing button) shows once.
  if (items.some((i) => i.kind === kind && i.message === text)) return;
  items = [...items.slice(-2), { id: nextId++, kind, message: text }];
  vibrate(kind === 'error' ? [18, 60, 18] : 12);
  emit();
}

export function dismissToast(id: number): void {
  items = items.filter((i) => i.id !== id);
  emit();
}

export const toast = {
  error: (message: string) => push('error', message),
  success: (message: string) => push('success', message),
  info: (message: string) => push('info', message),
};

/** Shows `error` as a toast whenever it is set to a (new) message. */
export function useErrorToast(error: string | null | undefined): void {
  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
}

const STYLE: Record<Kind, { icon: React.ComponentType<{ className?: string }>; ring: string; tone: string }> = {
  error: { icon: AlertCircle, ring: 'border-red-400/30', tone: 'text-red-300' },
  success: { icon: CheckCircle2, ring: 'border-emerald-400/30', tone: 'text-emerald-300' },
  info: { icon: Info, ring: 'border-white/15', tone: 'text-gold-500' },
};

function ToastCard({ item }: { item: Item }) {
  const reduce = useReducedMotion();
  const { icon: Icon, ring, tone } = STYLE[item.kind];
  React.useEffect(() => {
    const id = window.setTimeout(() => dismissToast(item.id), item.kind === 'error' ? 6000 : 4000);
    return () => window.clearTimeout(id);
  }, [item.id, item.kind]);

  return (
    <motion.div
      layout={!reduce}
      role={item.kind === 'error' ? 'alert' : 'status'}
      data-no-haptic
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -72, scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -72, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      drag={reduce ? false : 'y'}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.05 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -24 || info.velocity.y < -300) dismissToast(item.id);
      }}
      onClick={() => dismissToast(item.id)}
      className={`pointer-events-auto flex w-full max-w-md cursor-pointer touch-none items-start gap-3 rounded-2xl border bg-[#1a1b21]/95 px-4 py-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl ${ring}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
      <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-white">{item.message}</p>
      <X className="mt-0.5 h-4 w-4 shrink-0 text-white/35" aria-hidden />
    </motion.div>
  );
}

/** Mount once, near the root of the page. */
export function Toaster() {
  const [list, setList] = React.useState<Item[]>(items);
  React.useEffect(() => {
    const sync = () => setList(items);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[130] flex flex-col items-center gap-2 px-4 pt-[calc(max(env(safe-area-inset-top),12px)+8px)]"
    >
      <AnimatePresence initial={false}>
        {list.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
