import { describe, it, expect } from 'vitest';
import { validateAngleForParts } from './angle-validator';

describe('domain/angle-validator', () => {
  it('validates universal detailing finishes on all angles', () => {
    for (let angle = 1; angle <= 8; angle++) {
      const result = validateAngleForParts(angle, ['BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']);
      expect(result.isCompatible).toBe(true);
      expect(result.incompatibleSlots).toHaveLength(0);
    }
  });

  it('rejects front bumper on Angle 5 (Rear 180°) and recommends Angle 1', () => {
    const result = validateAngleForParts(5, ['FRONT_BUMPER']);
    expect(result.isCompatible).toBe(false);
    expect(result.incompatibleSlots).toContain('FRONT_BUMPER');
    expect(result.recommendedAngleId).toBe(1);
  });

  it('rejects rear diffuser on Angle 1 (Front 0°) and recommends Angle 5', () => {
    const result = validateAngleForParts(1, ['REAR_DIFFUSER']);
    expect(result.isCompatible).toBe(false);
    expect(result.incompatibleSlots).toContain('REAR_DIFFUSER');
    expect(result.recommendedAngleId).toBe(5);
  });

  it('accepts wheels on 3/4 angles (2, 4, 6, 8) and profile angles (3, 7)', () => {
    expect(validateAngleForParts(2, ['WHEELS_RIMS']).isCompatible).toBe(true);
    expect(validateAngleForParts(3, ['WHEELS_RIMS']).isCompatible).toBe(true);
    expect(validateAngleForParts(4, ['WHEELS_RIMS']).isCompatible).toBe(true);
    expect(validateAngleForParts(1, ['WHEELS_RIMS']).isCompatible).toBe(false);
  });

  it('throws RangeError for invalid angle numbers', () => {
    expect(() => validateAngleForParts(0, ['WHEELS_RIMS'])).toThrow(RangeError);
    expect(() => validateAngleForParts(9, ['WHEELS_RIMS'])).toThrow(RangeError);
  });
});
