/**
 * Pure planning helpers for rendering one build on every captured side of the car.
 * One credit buys one rendered angle (PRD 5.2), so the exact price is known up front.
 */

export interface PlanAngle {
  id: string;
  label: string;
  /** The customer's photo of this side (data URL or http URL). Empty/missing = side not captured. */
  photo?: string | undefined;
}

export const CREDITS_PER_ANGLE = 1;

/** Preferred hero order: the most flattering 3/4 view first, it also anchors the other angles. */
const HERO_PREFERENCE = ['front-left', 'front-right', 'rear-right', 'rear-left', 'front', 'right', 'left', 'rear'];

export function capturedAngles(angles: PlanAngle[]): PlanAngle[] {
  return angles.filter((a) => typeof a.photo === 'string' && a.photo.length > 5);
}

export function heroAngleId(angles: PlanAngle[]): string | null {
  const have = new Set(capturedAngles(angles).map((a) => a.id));
  return HERO_PREFERENCE.find((id) => have.has(id)) ?? capturedAngles(angles)[0]?.id ?? null;
}

export interface RenderPlan {
  /** Angles in the order they will be rendered: hero first, then the rest. */
  order: PlanAngle[];
  creditsNeeded: number;
  heroId: string | null;
}

export function planRender(angles: PlanAngle[]): RenderPlan {
  const have = capturedAngles(angles);
  const heroId = heroAngleId(angles);
  const order = [...have].sort((a, b) => (a.id === heroId ? -1 : b.id === heroId ? 1 : 0));
  return { order, creditsNeeded: order.length * CREDITS_PER_ANGLE, heroId };
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
