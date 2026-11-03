/**
 * CarVision Pure Domain Module: Angle & Slot Compatibility Validator
 * Validates whether selected parts can physically be rendered on a given camera angle.
 */

export type CategorySlot =
  | 'WHEELS_RIMS'
  | 'FRONT_BUMPER'
  | 'REAR_BUMPER'
  | 'REAR_DIFFUSER'
  | 'SIDE_SKIRTS'
  | 'HEADLIGHTS'
  | 'TAILLIGHTS'
  | 'HOOD'
  | 'TRUNK_SPOILER'
  | 'BODY_COLOR'
  | 'WINDOW_TINT'
  | 'POLISH_COAT';

export interface AngleValidationResult {
  isCompatible: boolean;
  recommendedAngleId?: number;
  incompatibleSlots: CategorySlot[];
}

// Maps which slots are visible and valid on each of the 8 standard angles
const ANGLE_SLOT_COMPATIBILITY: Record<number, Set<CategorySlot>> = {
  1: new Set(['FRONT_BUMPER', 'HEADLIGHTS', 'HOOD', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']),
  2: new Set(['FRONT_BUMPER', 'HEADLIGHTS', 'HOOD', 'WHEELS_RIMS', 'SIDE_SKIRTS', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']),
  3: new Set(['WHEELS_RIMS', 'SIDE_SKIRTS', 'WINDOW_TINT', 'BODY_COLOR', 'POLISH_COAT']),
  4: new Set(['REAR_BUMPER', 'REAR_DIFFUSER', 'TAILLIGHTS', 'TRUNK_SPOILER', 'WHEELS_RIMS', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']),
  5: new Set(['REAR_BUMPER', 'REAR_DIFFUSER', 'TAILLIGHTS', 'TRUNK_SPOILER', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']),
  6: new Set(['REAR_BUMPER', 'REAR_DIFFUSER', 'TAILLIGHTS', 'TRUNK_SPOILER', 'WHEELS_RIMS', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']),
  7: new Set(['WHEELS_RIMS', 'SIDE_SKIRTS', 'WINDOW_TINT', 'BODY_COLOR', 'POLISH_COAT']),
  8: new Set(['FRONT_BUMPER', 'HEADLIGHTS', 'HOOD', 'WHEELS_RIMS', 'SIDE_SKIRTS', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT']),
};

// Best default viewing angles for individual slots
const SLOT_DEFAULT_ANGLES: Record<CategorySlot, number> = {
  WHEELS_RIMS: 2,
  FRONT_BUMPER: 1,
  HEADLIGHTS: 1,
  HOOD: 1,
  SIDE_SKIRTS: 3,
  REAR_BUMPER: 5,
  REAR_DIFFUSER: 5,
  TAILLIGHTS: 5,
  TRUNK_SPOILER: 4,
  BODY_COLOR: 2,
  WINDOW_TINT: 2,
  POLISH_COAT: 2,
};

/**
 * Validates if an angle is compatible with the selected slots.
 */
export function validateAngleForParts(angleId: number, slots: CategorySlot[]): AngleValidationResult {
  if (angleId < 1 || angleId > 8 || !Number.isInteger(angleId)) {
    throw new RangeError('Angle ID must be an integer between 1 and 8');
  }

  const allowedSlots = ANGLE_SLOT_COMPATIBILITY[angleId];
  if (!allowedSlots) {
    throw new Error(`Unknown angle ID: ${angleId}`);
  }

  const incompatibleSlots = slots.filter((slot) => !allowedSlots.has(slot));

  if (incompatibleSlots.length === 0) {
    return {
      isCompatible: true,
      incompatibleSlots: [],
    };
  }

  // Find a recommended angle that supports the first incompatible slot
  const firstIncompatible = incompatibleSlots[0];
  const recommendedAngleId = firstIncompatible ? SLOT_DEFAULT_ANGLES[firstIncompatible] : 2;

  return {
    isCompatible: false,
    recommendedAngleId,
    incompatibleSlots,
  };
}
