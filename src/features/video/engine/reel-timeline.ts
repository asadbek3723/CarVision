/**
 * CarVision cinematic reel: one fixed, professionally paced edit (no user choices).
 * Only the finished (tuned) photos are used: the stock car never appears.
 *
 * The edit is a shot list built from the tuned photos. Every photo is reused for several
 * shots (wide, detail close-ups, tracking pans), so even 1-2 photos give a fast multi-cut
 * montage. Picture and score both read the same list, so every cut lands on the music.
 *
 *   0.0 –  2.0  OPEN     darkness, light flickers reveal details, hero reveal
 *   2.0 –  4.0  BUILD    one shot per beat, stutter cuts into the drop
 *   4.0         DROP     flash, shockwave, title slam
 *   4.0 – 10.0  DRIVE    fast montage: 1/2 and 1/4 beat cuts, whip pans, part callouts
 *  10.0 – 12.0  BREAK    half-time slow motion, letterbox
 *  12.0 – 13.0  STUTTER  1/8 beat cuts across every angle
 *  13.0 – 16.0  OUTRO    hero behind the brand card
 */

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const REEL_FPS = 30;
export const REEL_BPM = 120;
export const BEAT = 60 / REEL_BPM; // 0.5s

export const T_OPEN_END = 2.0;
export const T_DROP = 4.0;
export const T_DRIVE_END = 10.0;
export const T_BREAK_END = 12.0;
export const T_OUTRO = 13.0;
export const REEL_DURATION = 16.0;

/** Framing of a still photo inside the vertical frame. */
export type ShotFrame =
  /** the whole car across the frame width, blurred fill above and below */
  | 'band'
  /** full-bleed vertical crop (shows part of the car) */
  | 'full';

/** How the shot comes on screen. */
export type ShotTransition = 'cut' | 'whip' | 'flash' | 'zoom' | 'glitch' | 'fade';

export interface ShotCamera {
  /** focus point in the photo, 0..1 */
  cx: number;
  cy: number;
  /** 1 = the photo just covers the frame */
  zoom: number;
}

export interface Shot {
  start: number;
  dur: number;
  /** index into the tuned photos */
  angle: number;
  frame: ShotFrame;
  from: ShotCamera;
  to: ShotCamera;
  transition: ShotTransition;
  /** -1 / 1: direction of whips and pans */
  dir: 1 | -1;
  /** motion curve inside the shot: 'ramp' = fast start, slow end (speed ramp) */
  ease: 'linear' | 'ramp' | 'smooth';
  section: 'open' | 'build' | 'drop' | 'drive' | 'break' | 'stutter' | 'outro';
}

/** Camera recipes. Generic so they work for any angle of any car. */
const WIDE_IN: [ShotCamera, ShotCamera] = [
  { cx: 0.5, cy: 0.52, zoom: 1.0 },
  { cx: 0.5, cy: 0.52, zoom: 1.12 },
];
const WIDE_OUT: [ShotCamera, ShotCamera] = [
  { cx: 0.5, cy: 0.5, zoom: 1.18 },
  { cx: 0.5, cy: 0.52, zoom: 1.02 },
];
const DETAIL_LOW_START: [ShotCamera, ShotCamera] = [
  { cx: 0.28, cy: 0.66, zoom: 2.1 },
  { cx: 0.32, cy: 0.64, zoom: 2.35 },
];
const DETAIL_LOW_END: [ShotCamera, ShotCamera] = [
  { cx: 0.74, cy: 0.66, zoom: 2.1 },
  { cx: 0.7, cy: 0.64, zoom: 2.35 },
];
const DETAIL_HIGH: [ShotCamera, ShotCamera] = [
  { cx: 0.42, cy: 0.44, zoom: 1.9 },
  { cx: 0.48, cy: 0.46, zoom: 2.1 },
];
const TRACK: [ShotCamera, ShotCamera] = [
  { cx: 0.22, cy: 0.56, zoom: 1.0 },
  { cx: 0.78, cy: 0.56, zoom: 1.0 },
];
const LOW_PASS: [ShotCamera, ShotCamera] = [
  { cx: 0.36, cy: 0.62, zoom: 1.45 },
  { cx: 0.64, cy: 0.6, zoom: 1.55 },
];

interface Recipe {
  frame: ShotFrame;
  cam: [ShotCamera, ShotCamera];
}

/** Order the montage walks through; mixes wide and detail so cuts never look alike. */
const MONTAGE: Recipe[] = [
  { frame: 'full', cam: TRACK },
  { frame: 'full', cam: DETAIL_LOW_START },
  { frame: 'band', cam: WIDE_IN },
  { frame: 'full', cam: DETAIL_HIGH },
  { frame: 'full', cam: LOW_PASS },
  { frame: 'full', cam: DETAIL_LOW_END },
  { frame: 'band', cam: WIDE_OUT },
];

function mirror(cam: [ShotCamera, ShotCamera], dir: 1 | -1): [ShotCamera, ShotCamera] {
  if (dir === 1) return cam;
  return [cam[1], cam[0]];
}

/**
 * Builds the full shot list for `angleCount` tuned photos (1..5, the first is the hero).
 * Pure and deterministic: the same input always gives the same edit.
 */
export function buildShotList(angleCount: number): Shot[] {
  const n = Math.max(1, Math.min(5, Math.floor(angleCount) || 1));
  const shots: Shot[] = [];
  let recipe = 0;
  let angleCursor = 0;
  let flip: 1 | -1 = 1;

  const nextAngle = () => {
    const a = angleCursor % n;
    angleCursor += 1;
    return a;
  };
  const push = (
    start: number,
    dur: number,
    section: Shot['section'],
    transition: ShotTransition,
    opts: Partial<Pick<Shot, 'angle' | 'frame' | 'from' | 'to' | 'ease'>> = {}
  ) => {
    const r = MONTAGE[recipe % MONTAGE.length]!;
    recipe += 1;
    flip = flip === 1 ? -1 : 1;
    const [from, to] = mirror(r.cam, flip);
    shots.push({
      start,
      dur,
      angle: opts.angle ?? nextAngle(),
      frame: opts.frame ?? r.frame,
      from: opts.from ?? from,
      to: opts.to ?? to,
      transition,
      dir: flip,
      ease: opts.ease ?? 'smooth',
      section,
    });
  };

  // OPEN: two light-flicker glimpses of details, then the hero rises out of the dark
  push(0.0, 0.5, 'open', 'fade', { angle: 0, frame: 'full', from: DETAIL_LOW_START[0], to: DETAIL_LOW_START[1], ease: 'linear' });
  push(0.5, 0.5, 'open', 'fade', { angle: n > 1 ? 1 : 0, frame: 'full', from: DETAIL_HIGH[0], to: DETAIL_HIGH[1], ease: 'linear' });
  push(1.0, 1.0, 'open', 'fade', { angle: 0, frame: 'band', from: { cx: 0.5, cy: 0.52, zoom: 1.22 }, to: { cx: 0.5, cy: 0.52, zoom: 1.04 }, ease: 'smooth' });

  // BUILD: one shot per beat, the last beat stutters in 1/8 notes
  angleCursor = n > 1 ? 1 : 0;
  for (let b = 0; b < 3; b++) push(T_OPEN_END + b * BEAT, BEAT, 'build', b === 0 ? 'cut' : 'whip');
  for (let s = 0; s < 4; s++) push(T_OPEN_END + 3 * BEAT + s * (BEAT / 4), BEAT / 4, 'build', 'glitch');

  // DROP: the hero, big
  push(T_DROP, 1.0, 'drop', 'flash', { angle: 0, frame: 'band', from: { cx: 0.5, cy: 0.52, zoom: 1.35 }, to: { cx: 0.5, cy: 0.52, zoom: 1.06 }, ease: 'ramp' });

  // DRIVE: bars of [1/2, 1/4, 1/4, 1/2, 1/2] beats... in seconds [0.5, 0.25, 0.25, 0.5, 0.5]
  const bar = [BEAT, BEAT / 2, BEAT / 2, BEAT, BEAT];
  const barTransitions: ShotTransition[] = ['whip', 'cut', 'cut', 'zoom', 'cut'];
  let t = T_DROP + 1.0;
  let i = 0;
  while (t < T_DRIVE_END - 1e-6) {
    const k = i % bar.length;
    const dur = Math.min(bar[k]!, T_DRIVE_END - t);
    push(t, dur, 'drive', barTransitions[k]!, { ease: dur >= BEAT ? 'smooth' : 'linear' });
    t += dur;
    i += 1;
  }

  // BREAK: half-time slow motion, two long speed-ramped shots
  push(T_DRIVE_END, 1.0, 'break', 'whip', { angle: 0, frame: 'full', from: TRACK[0], to: { cx: 0.5, cy: 0.56, zoom: 1.05 }, ease: 'ramp' });
  push(T_DRIVE_END + 1.0, 1.0, 'break', 'fade', { angle: (n - 1) % n, frame: 'band', from: WIDE_OUT[0], to: WIDE_OUT[1], ease: 'ramp' });

  // STUTTER: 1/8 beat cuts across every angle, ends on the hero
  angleCursor = 0;
  for (let s = 0; s < 8; s++) push(T_BREAK_END + s * (BEAT / 4), BEAT / 4, 'stutter', s % 2 === 0 ? 'flash' : 'glitch');

  // OUTRO: hero, slow pull back behind the brand card
  push(T_OUTRO, REEL_DURATION - T_OUTRO, 'outro', 'flash', { angle: 0, frame: 'band', from: { cx: 0.5, cy: 0.52, zoom: 1.16 }, to: { cx: 0.5, cy: 0.52, zoom: 1.0 }, ease: 'ramp' });

  return shots;
}

/** The shot on screen at time `t` (binary search; shots are contiguous and sorted). */
export function shotAt(shots: Shot[], t: number): { shot: Shot; index: number } {
  let lo = 0;
  let hi = shots.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (shots[mid]!.start <= t) lo = mid;
    else hi = mid - 1;
  }
  return { shot: shots[lo]!, index: lo };
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
