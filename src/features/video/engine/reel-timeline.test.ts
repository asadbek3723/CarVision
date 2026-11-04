import { describe, it, expect } from 'vitest';
import {
  BEAT,
  REEL_DURATION,
  T_BREAK_END,
  T_DRIVE_END,
  T_DROP,
  T_OUTRO,
  buildShotList,
  easeInOutCubic,
  shotAt,
} from './reel-timeline';

describe('reel timeline', () => {
  it('orders the sections', () => {
    expect(T_DROP).toBeLessThan(T_DRIVE_END);
    expect(T_DRIVE_END).toBeLessThan(T_BREAK_END);
    expect(T_BREAK_END).toBeLessThan(T_OUTRO);
    expect(T_OUTRO).toBeLessThan(REEL_DURATION);
  });

  it('covers the whole reel with contiguous shots for any photo count', () => {
    for (const n of [0, 1, 2, 3, 5, 9]) {
      const shots = buildShotList(n);
      expect(shots[0]!.start).toBe(0);
      for (let i = 1; i < shots.length; i++) {
        expect(shots[i]!.start).toBeCloseTo(shots[i - 1]!.start + shots[i - 1]!.dur, 6);
      }
      const last = shots[shots.length - 1]!;
      expect(last.start + last.dur).toBeCloseTo(REEL_DURATION, 6);
      const max = Math.max(1, Math.min(5, n));
      expect(shots.every((s) => s.angle >= 0 && s.angle < max)).toBe(true);
    }
  });

  it('cuts on the music grid (every cut on a 1/8 beat)', () => {
    for (const s of buildShotList(4)) {
      expect(((s.start / (BEAT / 4)) % 1 + 1) % 1).toBeCloseTo(0, 6);
    }
  });

  it('is a fast edit: many shots, short drive cuts, hero on drop and outro', () => {
    const shots = buildShotList(3);
    expect(shots.length).toBeGreaterThanOrEqual(30);
    const drive = shots.filter((s) => s.section === 'drive');
    expect(drive.every((s) => s.dur <= BEAT + 1e-9)).toBe(true);
    expect(shotAt(shots, T_DROP).shot.angle).toBe(0);
    expect(shotAt(shots, T_OUTRO + 1).shot.angle).toBe(0);
  });

  it('uses every photo in the montage', () => {
    const used = new Set(buildShotList(5).map((s) => s.angle));
    expect(used.size).toBe(5);
  });

  it('finds the shot on screen', () => {
    const shots = buildShotList(2);
    expect(shotAt(shots, 0).index).toBe(0);
    expect(shotAt(shots, REEL_DURATION).shot.section).toBe('outro');
    expect(shotAt(shots, T_DROP + 0.01).shot.section).toBe('drop');
  });

  it('eases within 0..1', () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
  });
});
