'use client';

import * as React from 'react';
import { planRender, summarize, usableReference, type AngleState, type PlanAngle } from './render-plan';
import { visibleParts } from '@/lib/part-visibility';
import { readJson } from '@/lib/safe-json';
import { fitDataUrlToLimit } from '@/features/camera/lib/image-compressor';

export interface BuildPart {
  id: string;
  name: string;
  category?: string | undefined;
  spec?: string | undefined;
  price?: number | undefined;
  image?: string | undefined;
  angleImage?: string | undefined;
  swatch?: string | undefined;
  /** Where a light / bumper / body part sits: `front`, `rear` or `both` (decides which photos show it). */
  zone?: string | undefined;
}

export type FatalCode = 'UNAUTHENTICATED' | 'INSUFFICIENT_CREDITS' | 'PLAN_EXPIRED' | 'ACCOUNT_BLOCKED';

export interface RenderFatal {
  code: FatalCode;
  /** Server text (may be empty); prefer translating `code`. */
  message: string;
}

class RenderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

const FATAL_CODES: FatalCode[] = ['UNAUTHENTICATED', 'INSUFFICIENT_CREDITS', 'PLAN_EXPIRED', 'ACCOUNT_BLOCKED'];
const CONCURRENCY = 2;
const MAX_RATE_RETRIES = 3;

/** Body for POST /api/v1/generations (pure, unit-testable). */
export function toRequestBody(angle: PlanAngle, allParts: BuildPart[], referenceAfterUrl?: string) {
  // Only the parts that can be seen from this side go to the AI (and are paid for).
  const shown = visibleParts(allParts, angle.id);
  const parts = shown.length > 0 ? shown : allParts;
  const primary = parts[0]!;
  return {
    photo: angle.photo,
    angleId: angle.id,
    partId: primary.id,
    partName: parts.map((p) => p.name).join(' + '),
    partCategory: primary.category || 'Wheels',
    partSpec: primary.spec || undefined,
    partImage: primary.image,
    partAngleImage: primary.angleImage,
    partPrice: primary.price,
    swatchColor: primary.swatch || undefined,
    parts: parts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Wheels',
      spec: p.spec || undefined,
      image: p.image,
      angleImage: p.angleImage,
      swatch: p.swatch,
      zone: p.zone,
    })),
    idempotencyKey: crypto.randomUUID(),
    ...(referenceAfterUrl ? { referenceAfterUrl } : {}),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function renderAngle(angle: PlanAngle, parts: BuildPart[], reference?: string): Promise<{ url: string; demo: boolean }> {
  const photo = angle.photo ? await fitDataUrlToLimit(angle.photo) : angle.photo;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('/api/v1/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequestBody({ ...angle, photo }, parts, reference)),
    });
    const data = (await readJson(res)).data;
    if (res.ok && data.success && data.generation?.afterImageUrl) {
      return { url: data.generation.afterImageUrl as string, demo: Boolean(data.generation.demo) };
    }
    const code = String(data.code || 'FAILED');
    if (res.status === 429 && attempt < MAX_RATE_RETRIES) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    throw new RenderError(typeof data.error === 'string' ? data.error : '', res.status, code);
  }
}

/**
 * Renders one build on every captured side of the car, for real:
 * the best 3/4 view first (it becomes the same-build reference), then the rest two at a time.
 * Insufficient credits stop the run at once; a single failed side never blocks the others
 * (its credit is refunded server-side) and can be retried on its own.
 */
export function useRenderBuild(onCreditsChanged?: () => void) {
  const [states, setStates] = React.useState<AngleState[]>([]);
  const [running, setRunning] = React.useState(false);
  const [fatal, setFatal] = React.useState<RenderFatal | null>(null);
  const [demo, setDemo] = React.useState(false);
  const cancelled = React.useRef(false);
  const ctx = React.useRef<{ parts: BuildPart[]; reference?: string | undefined; angles: PlanAngle[] }>({ parts: [], angles: [] });

  const patch = React.useCallback((id: string, p: Partial<AngleState>) => {
    setStates((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }, []);

  const renderInto = React.useCallback(
    async (angle: PlanAngle): Promise<boolean> => {
      patch(angle.id, { status: 'rendering' });
      try {
        const r = await renderAngle(angle, ctx.current.parts, ctx.current.reference);
        if (r.demo) setDemo(true);
        patch(angle.id, { status: 'done', url: r.url });
        if (!ctx.current.reference) ctx.current.reference = usableReference(r.url);
        onCreditsChanged?.();
        return true;
      } catch (e) {
        const err = e instanceof RenderError ? e : new RenderError('', 0, 'NETWORK');
        onCreditsChanged?.();
        if ((FATAL_CODES as string[]).includes(err.code)) {
          setFatal({ code: err.code as FatalCode, message: err.message });
          patch(angle.id, { status: 'failed', error: err.message, errorCode: err.code });
          throw err;
        }
        patch(angle.id, { status: 'failed', error: err.message, errorCode: err.code });
        return false;
      }
    },
    [patch, onCreditsChanged]
  );

  const run = React.useCallback(
    async (angles: PlanAngle[], parts: BuildPart[]) => {
      const plan = planRender(angles, parts);
      if (plan.order.length === 0 || parts.length === 0) return;
      cancelled.current = false;
      ctx.current = { parts, angles: plan.order };
      setFatal(null);
      setDemo(false);
      setRunning(true);
      setStates([
        ...plan.order.map((a): AngleState => ({ id: a.id, label: a.label, status: 'queued' })),
        // Sides where no chosen part is visible: shown as skipped, never rendered, never charged.
        ...plan.skipped.map((a): AngleState => ({ id: a.id, label: a.label, status: 'skipped', skipReason: 'not-visible' })),
      ]);

      try {
        const [hero, ...rest] = plan.order;
        await renderInto(hero!);

        const queue = [...rest];
        const worker = async () => {
          while (queue.length && !cancelled.current) {
            const next = queue.shift()!;
            await renderInto(next);
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
      } catch {
        // Fatal (no credits, signed out, ...): everything still queued is skipped
        setStates((prev) => prev.map((s) => (s.status === 'queued' || s.status === 'rendering' ? { ...s, status: 'skipped' } : s)));
      } finally {
        setRunning(false);
      }
    },
    [renderInto]
  );

  /** Retry a single failed side (costs one credit again; the failed attempt was refunded). */
  const retry = React.useCallback(
    async (id: string) => {
      const angle = ctx.current.angles.find((a) => a.id === id);
      if (!angle || running) return;
      setFatal(null);
      setRunning(true);
      try {
        await renderInto(angle);
      } catch {
        // fatal already recorded
      } finally {
        setRunning(false);
      }
    },
    [renderInto, running]
  );

  const cancel = React.useCallback(() => {
    cancelled.current = true;
  }, []);

  const results = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of states) if (s.status === 'done' && s.url) m[s.id] = s.url;
    return m;
  }, [states]);

  return { states, running, fatal, demo, results, summary: summarize(states), run, retry, cancel };
}
