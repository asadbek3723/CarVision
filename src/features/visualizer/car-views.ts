/**
 * The side of the car each photo really shows, as the AI car check (`/api/v1/vehicles/detect`)
 * saw it, keyed by the photo's slot id (`front`, `rear`, `right`, `front-left`, `rear-right`).
 * A photo put in the wrong slot (a side photo uploaded as "front") would otherwise be rendered and
 * judged as the wrong side. Lives in sessionStorage next to the car check token.
 */
const KEY = 'carvision_car_views';

export const CAR_VIEWS = ['front', 'front-left', 'left', 'rear-left', 'rear', 'rear-right', 'right', 'front-right'] as const;
export type CarView = (typeof CAR_VIEWS)[number];

export function isCarView(v: unknown): v is CarView {
  return typeof v === 'string' && (CAR_VIEWS as readonly string[]).includes(v);
}

export function setCarViews(views: Record<string, unknown> | null | undefined): void {
  try {
    const clean: Record<string, CarView> = {};
    for (const [id, v] of Object.entries(views ?? {})) if (isCarView(v)) clean[id] = v;
    if (Object.keys(clean).length > 0) sessionStorage.setItem(KEY, JSON.stringify(clean));
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: photos are then treated as the side they were taken for
  }
}

export function getCarViews(): Record<string, CarView> {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const out: Record<string, CarView> = {};
    for (const [id, v] of Object.entries(parsed)) if (isCarView(v)) out[id] = v;
    return out;
  } catch {
    return {};
  }
}
