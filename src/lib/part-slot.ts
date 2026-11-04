/**
 * A "slot" is a place on the car that holds one part at a time: a car can't wear two sets of
 * wheels, two front bumpers or two paint jobs. Picking a part fills its slot and replaces
 * whatever was in it.
 */
export interface SlotInfo {
  category?: string | undefined;
  name?: string | undefined;
  spec?: string | undefined;
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

const LIGHTS = ['fara', 'chiroq', 'optika', 'light', 'lamp', 'headlight', 'taillight', 'led'];
const SPOILER = ['spoyler', 'spoiler', 'wing', 'qanot'];
const EXHAUST = ['glushitel', 'exhaust', 'muffler'];
const WHEELS = ['wheel', 'disk', 'gildirak', 'rim', 'forged', 'alloy'];
const INTERIOR = ['salon', 'rul', "o'rindiq", 'seat', 'ambient', 'torpeda', 'steering', 'interior'];
const COLOR = ['wrap', 'plyonka', 'paint', 'rang'];

export function partSlot(part: SlotInfo): string {
  const category = (part.category ?? '').toLowerCase();
  const text = `${part.name ?? ''} ${part.spec ?? ''}`.toLowerCase();

  if (category === 'wheels') return 'wheels';
  if (category === 'interior') return 'interior';
  if (category === 'color') return 'color';
  if (category === 'suspension') return 'suspension';
  if (category === 'body kit') return has(text, SPOILER) ? 'spoiler' : 'body';
  if (category === 'performance') {
    if (has(text, EXHAUST)) return 'exhaust';
    if (has(text, LIGHTS)) return 'lights';
    return 'performance';
  }

  // Unknown category: guess from the name, otherwise the category itself is the slot.
  if (has(text, WHEELS)) return 'wheels';
  if (has(text, LIGHTS)) return 'lights';
  if (has(text, SPOILER)) return 'spoiler';
  if (has(text, EXHAUST)) return 'exhaust';
  if (has(text, INTERIOR)) return 'interior';
  if (has(text, COLOR)) return 'color';
  return category || 'other';
}

/**
 * New selection after tapping `id`: tapping a picked part removes it, tapping any other part
 * takes the slot of the part it replaces. Ids unknown to `catalog` are left untouched.
 */
export function toggleInSlot<T extends SlotInfo & { id: string }>(selectedIds: string[], id: string, catalog: T[]): string[] {
  if (selectedIds.includes(id)) return selectedIds.filter((x) => x !== id);
  const target = catalog.find((p) => p.id === id);
  if (!target) return [...selectedIds, id];
  const slot = partSlot(target);
  const clash = new Set(catalog.filter((p) => partSlot(p) === slot).map((p) => p.id));
  return [...selectedIds.filter((x) => !clash.has(x)), id];
}

/** Keeps the last picked part of every slot (cleans up older multi-part selections). */
export function onePerSlot<T extends SlotInfo & { id: string }>(selectedIds: string[], catalog: T[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const id of [...selectedIds].reverse()) {
    const part = catalog.find((p) => p.id === id);
    if (!part) {
      kept.push(id);
      continue;
    }
    const slot = partSlot(part);
    if (seen.has(slot)) continue;
    seen.add(slot);
    kept.push(id);
  }
  return kept.reverse();
}
