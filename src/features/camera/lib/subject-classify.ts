/**
 * What the smart camera is pointed at, decided from on-device object detections (COCO labels).
 *   car    -> green (shoot)
 *   person -> red   (a person, not a car)
 *   other  -> yellow (something else, or nothing recognisable)
 */
export type Subject = 'car' | 'person' | 'other';

export interface DetectedObject {
  label: string;
  score: number;
  /** Box area as a fraction of the frame (0..1). */
  area: number;
}

/** COCO classes that count as "the car" for this app. */
const VEHICLE_LABELS = new Set(['car', 'truck', 'bus']);
const MIN_SCORE = 0.35;
/** Tiny boxes (a car far in the background, a face in a poster) do not decide the colour. */
const MIN_AREA = 0.04;

/** The subject of one frame: the most prominent detection (area x confidence) wins. */
export function classifyFrame(objects: DetectedObject[]): Subject {
  let best: { subject: Subject; weight: number } | null = null;
  for (const o of objects) {
    if (o.score < MIN_SCORE || o.area < MIN_AREA) continue;
    const label = o.label.toLowerCase();
    const subject: Subject = VEHICLE_LABELS.has(label) ? 'car' : label === 'person' ? 'person' : 'other';
    const weight = o.area * o.score;
    if (!best || weight > best.weight) best = { subject, weight };
  }
  return best?.subject ?? 'other';
}

/**
 * Smooths the per-frame answer so the frame colour does not flicker: the colour only changes when
 * the new subject wins the majority of the last `window` frames.
 */
export function createSubjectSmoother(window = 4) {
  const history: Subject[] = [];
  let current: Subject | null = null;
  return (next: Subject): Subject => {
    history.push(next);
    if (history.length > window) history.shift();
    const counts = new Map<Subject, number>();
    for (const s of history) counts.set(s, (counts.get(s) ?? 0) + 1);
    const [leader, votes] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    if (current === null || (leader !== current && votes > history.length / 2)) current = leader;
    return current;
  };
}
