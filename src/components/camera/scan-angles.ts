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
 * Up to 5 angles, ordered as one continuous walk around the car (clockwise from above):
 * front → right side → rear-right corner → rear → front-left corner.
 * Every angle is optional: at least 1 photo, at most 5. The AI car check tells which side each
 * photo really shows, and only parts visible on those sides are rendered.
 */
export const GUIDED_SCAN_ANGLES: GuidedScanAngle[] = [
  { id: 1, key: 'front', slug: 'front', coneAngle: 0, isPrimary: true },
  { id: 2, key: 'right', slug: 'right', coneAngle: 90 },
  { id: 3, key: 'rearRight', slug: 'rear-right', coneAngle: 135 },
  { id: 4, key: 'rear', slug: 'rear', coneAngle: 180 },
  { id: 5, key: 'frontLeft', slug: 'front-left', coneAngle: 315 },
];

/** Maximum number of photos (one per angle). */
export const REQUIRED_ANGLE_COUNT = GUIDED_SCAN_ANGLES.length;
/** Fewest photos the studio accepts. */
export const MIN_ANGLE_COUNT = 1;
