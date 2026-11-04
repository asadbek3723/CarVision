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

const WHEELS = ['wheel', 'disk', 'gildirak', 'rim', 'forged', 'alloy'];
const BODY = ['bamper', 'bumper', 'lip', 'splitter', 'diffuzor', 'skirt', 'spoyler', 'spoiler', 'wing', 'widebody', 'grille', 'hood'];
const INTERIOR = ['salon', 'rul', "o'rindiq", 'seat', 'ambient', 'torpeda', 'steering', 'interior'];
const COLOR = ['wrap', 'plyonka', 'paint', 'rang'];

/** The slot is the shop tab the part belongs to (Wheels, Body Kit, Performance, Interior, Color, ...). */
export function partSlot(part: SlotInfo): string {
  const category = (part.category ?? '').trim().toLowerCase();
  if (category) return category;

  // No category at all: guess from the name.
  const text = `${part.name ?? ''} ${part.spec ?? ''}`.toLowerCase();
  if (has(text, WHEELS)) return 'wheels';
  if (has(text, BODY)) return 'body kit';
  if (has(text, INTERIOR)) return 'interior';
  if (has(text, COLOR)) return 'color';
  return 'performance';
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
