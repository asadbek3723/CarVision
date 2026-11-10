import type { CatalogCategory } from '@/domain/catalog';

/**
 * Shot plans for the seller's Smart Product Camera: for each kind of part, which photos to take,
 * from which side, how far away and from what height. Texts live in `productCam.shots.<key>`.
 */

/** Product families that are photographed the same way. */
export type ShotProfile = 'wheel' | 'body' | 'light' | 'part' | 'interior' | 'finish';

export type ShotKey = 'front' | 'angle' | 'side' | 'back' | 'detail' | 'label' | 'set' | 'onCar' | 'surface';

/** Where the phone is held relative to the product. */
export type ShotHeight = 'level' | 'above' | 'top';

/** How much of the screen the product should fill. */
export type ShotFrame = 'full' | 'detail' | 'label' | 'wide';

export interface ProductShot {
  key: ShotKey;
  /** Camera position around the product seen from above, clockwise; 0 = in front of the product. */
  bearing: number;
  /** Suggested distance from the product, in centimetres. */
  distance: readonly [number, number];
  height: ShotHeight;
  frame: ShotFrame;
}

const S = (key: ShotKey, bearing: number, distance: readonly [number, number], height: ShotHeight, frame: ShotFrame): ProductShot => ({
  key,
  bearing,
  distance,
  height,
  frame,
});

export const SHOT_PLANS: Record<ShotProfile, readonly ProductShot[]> = {
  wheel: [
    S('front', 0, [80, 120], 'level', 'full'),
    S('angle', 35, [80, 120], 'level', 'full'),
    S('side', 90, [60, 90], 'level', 'full'),
    S('detail', 15, [20, 35], 'level', 'detail'),
    S('label', 180, [15, 25], 'level', 'label'),
  ],
  body: [
    S('front', 0, [150, 250], 'level', 'full'),
    S('angle', 40, [150, 250], 'above', 'full'),
    S('side', 90, [120, 200], 'level', 'full'),
    S('detail', 20, [30, 50], 'level', 'detail'),
    S('back', 180, [80, 150], 'level', 'full'),
  ],
  light: [
    S('front', 0, [50, 80], 'level', 'full'),
    S('angle', 40, [50, 80], 'level', 'full'),
    S('back', 180, [40, 70], 'level', 'full'),
    S('detail', 10, [15, 30], 'level', 'detail'),
    S('label', 180, [15, 25], 'level', 'label'),
  ],
  part: [
    S('angle', 40, [60, 100], 'above', 'full'),
    S('side', 90, [60, 120], 'level', 'full'),
    S('detail', 20, [20, 35], 'level', 'detail'),
    S('label', 0, [15, 25], 'level', 'label'),
    S('set', 0, [80, 130], 'top', 'wide'),
  ],
  interior: [
    S('front', 0, [60, 100], 'level', 'full'),
    S('angle', 40, [60, 100], 'level', 'full'),
    S('detail', 15, [15, 30], 'level', 'detail'),
    S('back', 180, [50, 90], 'level', 'full'),
    S('set', 0, [80, 130], 'top', 'wide'),
  ],
  finish: [
    S('onCar', 40, [300, 450], 'level', 'wide'),
    S('surface', 30, [40, 70], 'level', 'detail'),
    S('detail', 10, [20, 40], 'level', 'detail'),
    S('side', 90, [300, 450], 'level', 'wide'),
    S('label', 0, [15, 25], 'level', 'label'),
  ],
};

export const CATEGORY_PROFILE: Record<CatalogCategory, ShotProfile> = {
  wheels: 'wheel',
  body_kit: 'body',
  spoiler: 'body',
  lighting: 'light',
  suspension: 'part',
  exhaust: 'part',
  other: 'part',
  interior: 'interior',
  wrap_paint: 'finish',
  ceramic: 'finish',
  polish: 'finish',
};

/** One representative category per profile (picked in the camera, it also sets the form's category). */
export const PROFILE_CATEGORY: Record<ShotProfile, CatalogCategory> = {
  wheel: 'wheels',
  body: 'body_kit',
  light: 'lighting',
  part: 'other',
  interior: 'interior',
  finish: 'wrap_paint',
};

export const SHOT_PROFILES = Object.keys(SHOT_PLANS) as ShotProfile[];

/** Phone pitch (degrees, negative = looking down) that fits each height. */
export const PITCH_RANGE: Record<ShotHeight, readonly [number, number]> = {
  level: [-15, 8],
  above: [-45, -15],
  top: [-90, -60],
};

export type PitchHint = 'ok' | 'tiltDown' | 'tiltUp';

export function pitchHint(pitch: number, height: ShotHeight): PitchHint {
  const [min, max] = PITCH_RANGE[height];
  if (pitch > max) return 'tiltDown';
  if (pitch < min) return 'tiltUp';
  return 'ok';
}

export type LightHint = 'ok' | 'dark' | 'bright' | 'backlit';

/**
 * Judges the light from a small grey-scale sample of the frame (values 0..255, row-major).
 * Backlit = the middle (where the product is) is much darker than the edges (a window behind it).
 */
export function lightHint(gray: ArrayLike<number>, width: number, height: number): LightHint {
  let sum = 0;
  let centre = 0;
  let centreN = 0;
  let edge = 0;
  let edgeN = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = gray[y * width + x] ?? 0;
      sum += v;
      const inCentre = x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7;
      if (inCentre) {
        centre += v;
        centreN++;
      } else if (x < width * 0.15 || x > width * 0.85 || y < height * 0.15 || y > height * 0.85) {
        edge += v;
        edgeN++;
      }
    }
  }
  const mean = sum / Math.max(1, width * height);
  if (mean < 55) return 'dark';
  if (mean > 220) return 'bright';
  if (centreN && edgeN && edge / edgeN - centre / centreN > 70) return 'backlit';
  return 'ok';
}
