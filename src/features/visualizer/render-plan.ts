import { visibleParts, type VisibilityPart } from '@/lib/part-visibility';

/**
 * Pure planning helpers for rendering one build on every captured side of the car.
 * One credit buys one rendered angle (PRD 5.2), so the exact price is known up front.
 */

export interface PlanAngle {
  id: string;
  label: string;
  /** The customer's photo of this side (data URL or http URL). Empty/missing = side not captured. */
  photo?: string | undefined;
  /** The side the photo really shows (AI check); falls back to `id`. */
  view?: string | undefined;
}

/** The side used to decide what a photo can show: the AI-detected one, else the slot it was taken for. */
export const sideOf = (a: PlanAngle): string => a.view || a.id;

export const CREDITS_PER_ANGLE = 1;

/** Preferred hero order: the most flattering 3/4 view first, it also anchors the other angles. */
const HERO_PREFERENCE = ['front-left', 'front-right', 'rear-right', 'rear-left', 'right', 'left', 'front', 'rear'];

export function capturedAngles(angles: PlanAngle[]): PlanAngle[] {
  return angles.filter((a) => typeof a.photo === 'string' && a.photo.length > 5);
}

export function heroAngleId(angles: PlanAngle[]): string | null {
  // The hero becomes the look reference for the other sides: a 3/4 view shows the most of the build.
  const captured = capturedAngles(angles);
  for (const side of HERO_PREFERENCE) {
    const hit = captured.find((a) => sideOf(a) === side);
    if (hit) return hit.id;
  }
  return captured[0]?.id ?? null;
}

export interface RenderPlan {
  /** Angles in the order they will be rendered: hero first, then the rest. */
  order: PlanAngle[];
  creditsNeeded: number;
  heroId: string | null;
  /** Photographed angles where none of the chosen parts can be seen: not rendered, not charged. */
  skipped: PlanAngle[];
  /** Chosen parts that none of the photographed angles can show (the customer must add a photo). */
  hiddenPartIds: string[];
  /** Parts are chosen and photos exist, but not a single angle can show any part. */
  noneVisible: boolean;
}

/**
 * `parts` (optional) limits the plan to angles that can actually show at least one chosen part:
 * the other photographed angles are `skipped` and cost nothing.
 */
export function planRender(angles: PlanAngle[], parts?: Array<VisibilityPart & { id: string }>): RenderPlan {
  const photographed = capturedAngles(angles);
  const chosen = parts ?? [];
  const checkParts = chosen.length > 0;

  const have = checkParts ? photographed.filter((a) => visibleParts(chosen, sideOf(a)).length > 0) : photographed;
  const skipped = checkParts ? photographed.filter((a) => !have.includes(a)) : [];
  const hiddenPartIds = checkParts
    ? chosen.filter((p) => !photographed.some((a) => visibleParts([p], sideOf(a)).length > 0)).map((p) => p.id)
    : [];

  const heroId = heroAngleId(have);
  const order = [...have].sort((a, b) => (a.id === heroId ? -1 : b.id === heroId ? 1 : 0));
  return {
    order,
    creditsNeeded: order.length * CREDITS_PER_ANGLE,
    heroId,
    skipped,
    hiddenPartIds,
    noneVisible: checkParts && photographed.length > 0 && order.length === 0,
  };
}

export type AngleStatus = 'queued' | 'rendering' | 'done' | 'failed' | 'skipped';

export interface AngleState {
  id: string;
  label: string;
  status: AngleStatus;
  /** Result image (permanent URL when AI is live). */
  url?: string;
  error?: string;
  /** API error code of the failure; the UI translates it (`apiErrors.<code>`). */
  errorCode?: string;
  /** Why an angle was not rendered: the chosen parts cannot be seen from this side. */
  skipReason?: 'not-visible';
}

export function summarize(states: AngleState[]): { done: number; failed: number; total: number; percent: number } {
  const total = states.length;
  const done = states.filter((s) => s.status === 'done').length;
  const failed = states.filter((s) => s.status === 'failed').length;
  const settled = states.filter((s) => s.status === 'done' || s.status === 'failed' || s.status === 'skipped').length;
  return { done, failed, total, percent: total ? Math.round((settled / total) * 100) : 0 };
}

/** A permanent http(s) URL can be sent to the server as a same-build reference; a data URL cannot (size). */
export function usableReference(url: string | undefined): string | undefined {
  return url && /^https:\/\//.test(url) ? url : undefined;
}
