import { describe, it, expect } from 'vitest';
import { computeLevel, isLevel } from './device-level';

describe('device level', () => {
  it('is level for an upright portrait phone', () => {
    const l = computeLevel(90, 0, 0);
    expect(l.roll).toBeCloseTo(0, 5);
    expect(l.pitch).toBeCloseTo(0, 5);
    expect(isLevel(l)).toBe(true);
  });

  it('is level for an upright landscape phone (both rotations)', () => {
    // Landscape: gravity runs along the device x axis, so gamma = ∓90.
    expect(isLevel(computeLevel(0, -90, 90))).toBe(true);
    expect(isLevel(computeLevel(0, 90, 270))).toBe(true);
  });

  it('reports the camera tilting down', () => {
    const l = computeLevel(110, 0, 0); // top of phone leaning back towards the user → looking up
    expect(l.pitch).toBeGreaterThan(15);
  });

  it('flags a tilted horizon', () => {
    const l = computeLevel(70, -30, 0); // leaning sideways ≈ 10° horizon tilt
    expect(Math.abs(l.roll)).toBeGreaterThan(8);
    expect(isLevel(l)).toBe(false);
  });
});
