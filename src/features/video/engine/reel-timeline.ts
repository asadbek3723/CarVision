/**
 * CarVision cinematic reel: one fixed, professionally paced script (no user choices).
 * Shared by the picture renderer and the score so picture and sound hit together.
 *
 *   0.0 – 2.0   PROLOGUE   stock car, slow push-in, brand + "ZAVOD HOLATI"
 *   2.0 – 3.5   SCAN       laser sweep reveals the tuned car, riser builds
 *   3.5         IMPACT     flash, shockwave, screen shake, title slam
 *   3.5 – 11.0  SHOWCASE   every angle, beat-locked cuts, part lower-thirds
 *  11.0 – 13.0  BEFORE/AFTER  animated split wipe
 *  13.0 – 16.0  OUTRO      brand card
 */

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const REEL_FPS = 30;
export const REEL_BPM = 120;
export const BEAT = 60 / REEL_BPM; // 0.5s

export const T_INTRO_END = 2.0;
export const T_SCAN_END = 3.5;
export const T_SHOW_END = 11.0;
export const T_BA_END = 13.0;
export const REEL_DURATION = 16.0;

/** Seconds each angle stays on screen (the showcase is always 7.5s, i.e. 15 beats). */
export function angleDuration(angleCount: number): number {
  return (T_SHOW_END - T_SCAN_END) / Math.max(1, angleCount);
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOutExpo = (t: number): number => (clamp01(t) >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(t)));
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp01(t);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
