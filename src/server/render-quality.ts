import { partKind, type PartKind } from '@/server/providers/ai/direct-fitment-engine';

/** What the second-look check stored on a render (`generations.render_check`). */
export interface StoredCheck {
  sameView?: boolean;
  sameCar?: boolean;
  keepsRest?: boolean;
  partsComplete?: boolean;
  problem?: string;
  retried?: boolean;
}

export interface QualityRow {
  provider: string | null;
  parts: unknown;
  render_check: StoredCheck | null;
  feedback: string | null;
}

export interface QualityLine {
  key: string;
  renders: number;
  checked: number;
  /** Checked renders where the check found at least one fault. */
  faults: number;
  retried: number;
  disliked: number;
}

/** A stored check that found something wrong (another side / car, an unwanted change, an unfinished part). */
export function hasFault(c: StoredCheck | null | undefined): boolean {
  return Boolean(c) && (c!.sameView === false || c!.sameCar === false || c!.keepsRest === false || c!.partsComplete === false);
}

/** The model of a `provider` column ("gemini-ai:gemini-3.1-flash-image" -> "gemini-3.1-flash-image"). */
export function modelOf(provider: string | null): string {
  if (!provider) return 'unknown';
  const at = provider.indexOf(':');
  return at >= 0 ? provider.slice(at + 1) : provider;
}

function kindsOf(parts: unknown): PartKind[] {
  if (!Array.isArray(parts)) return [];
  const kinds = new Set<PartKind>();
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const { name, category } = p as { name?: unknown; category?: unknown };
    kinds.add(partKind({ name: typeof name === 'string' ? name : '', category: typeof category === 'string' ? category : '' }));
  }
  return [...kinds];
}

/**
 * Quality per model and per part type: how many renders the check looked at, how many it found a
 * fault in, how many needed a second try, and how many the customer marked "not right".
 * Sorted worst first (most faults + dislikes).
 */
export function summarizeQuality(rows: QualityRow[]): { byModel: QualityLine[]; byPart: QualityLine[] } {
  const byModel = new Map<string, QualityLine>();
  const byPart = new Map<string, QualityLine>();
  const bump = (map: Map<string, QualityLine>, key: string, row: QualityRow) => {
    const line = map.get(key) ?? { key, renders: 0, checked: 0, faults: 0, retried: 0, disliked: 0 };
    line.renders += 1;
    if (row.render_check) line.checked += 1;
    if (hasFault(row.render_check)) line.faults += 1;
    if (row.render_check?.retried) line.retried += 1;
    if (row.feedback) line.disliked += 1;
    map.set(key, line);
  };
  for (const row of rows) {
    bump(byModel, modelOf(row.provider), row);
    for (const kind of kindsOf(row.parts)) bump(byPart, kind, row);
  }
  const worstFirst = (a: QualityLine, b: QualityLine) => b.faults + b.disliked - (a.faults + a.disliked) || b.renders - a.renders;
  return { byModel: [...byModel.values()].sort(worstFirst), byPart: [...byPart.values()].sort(worstFirst) };
}
