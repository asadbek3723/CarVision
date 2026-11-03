/** Labels and instructions live in the `scanModal.angles.<key>` translations.
 * The mandatory photo angles of the guided scan, in capture order. */
export interface GuidedScanAngle {
  id: number;
  key: 'front' | 'right' | 'rear' | 'left';
  coneAngle: number;
  isPrimary?: boolean;
}

/**
 * 4 Mandatory Program-Driven Angles matching the 4-way Car Compass 1:1.
 * Users MUST upload/capture all 4 sides in sequence; skipping is forbidden.
 */
export const GUIDED_SCAN_ANGLES: GuidedScanAngle[] = [
  {
    id: 1,
    key: 'front',
    coneAngle: 0,
    isPrimary: true,
  },
  {
    id: 2,
    key: 'right',
    coneAngle: 90,
  },
  {
    id: 3,
    key: 'rear',
    coneAngle: 180,
  },
  {
    id: 4,
    key: 'left',
    coneAngle: 270,
  },
];

export const REQUIRED_ANGLE_COUNT = GUIDED_SCAN_ANGLES.length;
