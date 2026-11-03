import { describe, it, expect } from 'vitest';
import { BEAT, T_SCAN_END, T_SHOW_END, angleDuration, easeInOutCubic, REEL_DURATION, T_BA_END } from './reel-timeline';

describe('reel timeline', () => {
  it('keeps the showcase beat-aligned for any angle count', () => {
    for (const n of [1, 2, 3, 5]) {
      expect(angleDuration(n) * n).toBeCloseTo(T_SHOW_END - T_SCAN_END, 6);
    }
    expect(((T_SHOW_END - T_SCAN_END) / BEAT) % 1).toBe(0);
  });

  it('orders the sections', () => {
    expect(T_SCAN_END).toBeLessThan(T_SHOW_END);
    expect(T_SHOW_END).toBeLessThan(T_BA_END);
    expect(T_BA_END).toBeLessThan(REEL_DURATION);
  });

  it('eases within 0..1', () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
  });
});
