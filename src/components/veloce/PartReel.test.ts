import { describe, expect, it } from 'vitest';
import { measure } from './PartReel';

describe('PartReel card shape', () => {
  it('is landscape 4:3 on desktop', () => {
    const m = measure(1000, 900, 1440);
    expect(m.cardW / m.size).toBeCloseTo(4 / 3, 1);
    // neighbours are spaced by the card width, so wide cards never overlap
    expect(m.slot).toBeGreaterThan(m.cardW);
  });

  it('stays square on phones and tablets', () => {
    for (const [stage, vw] of [[360, 390], [700, 820]] as const) {
      const m = measure(stage, 800, vw);
      expect(m.cardW).toBe(m.size);
    }
  });

  it('keeps the same card height, so the stage does not grow on desktop', () => {
    const desk = measure(1000, 900, 1440);
    const narrowDesk = measure(1000, 900, 1000);
    expect(desk.size).toBe(narrowDesk.size);
    expect(desk.height).toBe(narrowDesk.height);
  });
});
