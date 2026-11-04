import { describe, expect, it } from 'vitest';
import { onePerSlot, partSlot, toggleInSlot } from './part-slot';

const catalog = [
  { id: 'w1', category: 'Wheels', name: 'BBS 20' },
  { id: 'w2', category: 'Wheels', name: 'OZ 19' },
  { id: 'b1', category: 'Body Kit', name: 'Front bamper' },
  { id: 's1', category: 'Body Kit', name: 'GT spoyler' },
  { id: 'l1', category: 'Performance', name: 'LED fara' },
  { id: 'e1', category: 'Performance', name: 'Sport glushitel' },
  { id: 'c1', category: 'Color', name: 'Black wrap' },
  { id: 'c2', category: 'Color', name: 'Gold wrap' },
];

describe('partSlot', () => {
  it('uses the shop tab as the slot', () => {
    expect(partSlot(catalog[2]!)).toBe('body kit');
    expect(partSlot(catalog[3]!)).toBe('body kit');
    expect(partSlot(catalog[4]!)).toBe('performance');
  });
});

describe('toggleInSlot', () => {
  it('replaces the part in the same slot', () => {
    expect(toggleInSlot(['w1', 'b1'], 'w2', catalog)).toEqual(['b1', 'w2']);
  });
  it('keeps parts of other slots', () => {
    expect(toggleInSlot(['w1'], 'l1', catalog)).toEqual(['w1', 'l1']);
    expect(toggleInSlot(['b1'], 's1', catalog)).toEqual(['s1']);
  });
  it('removes a picked part when tapped again', () => {
    expect(toggleInSlot(['w1', 'c1'], 'c1', catalog)).toEqual(['w1']);
  });
});

describe('onePerSlot', () => {
  it('keeps the last pick of each slot and unknown ids', () => {
    expect(onePerSlot(['c1', 'w1', 'c2', 'ghost'], catalog)).toEqual(['w1', 'c2', 'ghost']);
  });
});
