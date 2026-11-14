import { partSlot, type SlotInfo } from './part-slot';

/**
 * Which camera angles can actually show a part. A rear light is invisible in a photo of the front
 * of the car, a spoiler is not on the front, and nothing of the interior shows from outside. The
 * render pipeline uses this to skip angles where a part would not be visible (no credit is spent
 * and the customer is told to add a photo from the right side), and the server uses the same rule
 * so a direct API call cannot pay for an invisible part.
 */
export type PartZone = 'front' | 'rear' | 'both';

export interface VisibilityPart extends SlotInfo {
  /** Explicit position of a light / bumper / body part. Missing = guessed from the name. */
  zone?: string | undefined;
}

const FRONT_VIEWS = ['front', 'front-left', 'front-right'];
const REAR_VIEWS = ['rear', 'rear-left', 'rear-right'];
const SIDE_VIEWS = ['right', 'left', 'side'];
const THREE_QUARTER_VIEWS = ['front-left', 'front-right', 'rear-left', 'rear-right'];

const FRONT_WORDS = /\b(front|old|oldingi|headlight|hood|kapot|splitter|lip|grille)\b/;
const REAR_WORDS = /\b(rear|orqa|taillight|tail light|tail-light|diffuz\w*|diffuser|trunk|bagaj|back)\b/;

/** Front, rear or both: the explicit `zone`, else the name/spec, else both (never hide by guessing). */
export function partZone(part: VisibilityPart): PartZone {
  const explicit = (part.zone ?? '').trim().toLowerCase();
  if (explicit === 'front' || explicit === 'rear' || explicit === 'both') return explicit;
  const text = `${part.name ?? ''} ${part.spec ?? ''}`.toLowerCase();
  const front = FRONT_WORDS.test(text);
  const rear = REAR_WORDS.test(text);
  if (front && !rear) return 'front';
  if (rear && !front) return 'rear';
  return 'both';
}

/** Angle ids a part is visible from; `null` means every angle. Unknown slots are visible everywhere. */
function visibleFrom(part: VisibilityPart): string[] | null {
  switch (partSlot(part)) {
    case 'spoiler':
    case 'performance':
    case 'exhaust':
      return [...REAR_VIEWS, ...SIDE_VIEWS];
    case 'suspension':
      return [...SIDE_VIEWS, ...THREE_QUARTER_VIEWS];
    case 'interior':
      return [];
    case 'bumper':
    case 'lights':
    case 'body kit': {
      // A side profile shows the corner of the bumper and the edge of the lamps at both ends of the
      // car: the build must look the same there too, so a side photo is rendered with them.
      const zone = partZone(part);
      if (zone === 'front') return [...FRONT_VIEWS, ...SIDE_VIEWS];
      if (zone === 'rear') return [...REAR_VIEWS, ...SIDE_VIEWS];
      return null;
    }
    default:
      // wheels, color, ceramic, polish and anything unknown
      return null;
  }
}

/** True when `part` can be seen in a photo taken from `angleId`. An unknown angle id never hides a part. */
export function isPartVisibleFromAngle(part: VisibilityPart, angleId: string): boolean {
  const views = visibleFrom(part);
  if (views === null) return true;
  const known = [...FRONT_VIEWS, ...REAR_VIEWS, ...SIDE_VIEWS];
  if (!known.includes(angleId)) return true;
  return views.includes(angleId);
}

export function visibleParts<T extends VisibilityPart>(parts: T[], angleId: string): T[] {
  return parts.filter((p) => isPartVisibleFromAngle(p, angleId));
}

/** Camera sides of the guided scan, best first for asking the customer to photograph one. */
const SHOOT_ORDER = ['rear', 'front', 'right', 'rear-right', 'front-left'];

/**
 * The scan side to photograph so `part` becomes visible, or null when no outside photo can show it
 * (interior) or every side already would.
 */
export function sideToPhotograph(part: VisibilityPart): string | null {
  const views = visibleFrom(part);
  if (views === null || views.length === 0) return null;
  return SHOOT_ORDER.find((side) => views.includes(side)) ?? null;
}
