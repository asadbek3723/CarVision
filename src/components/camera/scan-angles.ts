/** Labels and instructions live in the `scanModal.angles.<key>` translations.
 * The mandatory photo angles of the guided scan, in capture order. */
export interface GuidedScanAngle {
  id: number;
  key: 'front' | 'right' | 'rearRight' | 'rear' | 'frontLeft';
  /** Stable id shared with the customize/studio side (`FIVE_CAR_ANGLES`). */
  slug: 'front' | 'right' | 'rear-right' | 'rear' | 'front-left';
  /** Compass bearing of the camera around the car, clockwise from the front (0 = in front of the car). */
  coneAngle: number;
  isPrimary?: boolean;
}

/**
 * 5 mandatory angles, ordered as one continuous walk around the car (clockwise from above):
 * front → right side → rear-right corner → rear → front-left corner.
 * Users MUST capture all 5 in sequence; skipping is forbidden.
 */
export const GUIDED_SCAN_ANGLES: GuidedScanAngle[] = [
  { id: 1, key: 'front', slug: 'front', coneAngle: 0, isPrimary: true },
  { id: 2, key: 'right', slug: 'right', coneAngle: 90 },
  { id: 3, key: 'rearRight', slug: 'rear-right', coneAngle: 135 },
  { id: 4, key: 'rear', slug: 'rear', coneAngle: 180 },
  { id: 5, key: 'frontLeft', slug: 'front-left', coneAngle: 315 },
];

export const REQUIRED_ANGLE_COUNT = GUIDED_SCAN_ANGLES.length;
