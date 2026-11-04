import {
  BEAT,
  REEL_DURATION,
  T_BREAK_END,
  T_DRIVE_END,
  T_DROP,
  T_OPEN_END,
  T_OUTRO,
  buildShotList,
} from './reel-timeline';

/**
 * Procedural cinematic score, synthesised with the Web Audio API (no audio files,
 * no licensing, zero cost). Everything is scheduled on the audio clock from the same
 * shot list as the picture, so every whip, glitch and drop has its own sound.
 *
 * Signal flow:
 *   drums ─┐
 *   808 ───┼─ music bus (filter sweeps) ─┐
 *   pads ──┘  (pads are side-chained)    ├─ saturation ─ glue comp ─ limiter ─ out
 *   sfx ─────────────────────────────────┘
 *   + stereo reverb and a dotted-eighth delay on sends
 */

export interface ReelAudio {
  /** Audio stream to mux into the recording. */
  stream: MediaStream;
  /** Starts the score and returns once the clock origin is set. */
  start: () => void;
  /** Seconds elapsed since start(), from the audio clock. */
  currentTime: () => number;
  /** False when the browser keeps the AudioContext suspended (no user gesture yet). */
  isRunning: () => boolean;
  close: () => void;
}

// A natural minor: i – VI – III – VII  (Am – F – C – G)
const CHORDS = [
  { root: 55.0, notes: [220.0, 261.63, 329.63, 440.0] }, // Am
  { root: 43.65, notes: [174.61, 220.0, 261.63, 349.23] }, // F
  { root: 65.41, notes: [196.0, 261.63, 329.63, 392.0] }, // C
  { root: 49.0, notes: [196.0, 246.94, 293.66, 392.0] }, // G
] as const;
const ARP = [440.0, 523.25, 659.25, 783.99, 880.0, 659.25, 587.33, 523.25];

export function createReelAudio(angleCount: number): ReelAudio | null {
  const Ctor: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctor) return null;

  let ctx: AudioContext;
  let dest: MediaStreamAudioDestinationNode;
  try {
    ctx = new Ctor({ latencyHint: 'playback' });
    dest = ctx.createMediaStreamDestination();
  } catch {
    return null;
  }

  let t0 = 0;
  let started = false;
  const at = (sec: number) => t0 + Math.max(0, sec);
  const SR = ctx.sampleRate;

  // ---- Master chain ---------------------------------------------------------------------------
  const out = ctx.createGain();
  out.gain.value = 0.92;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2.5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18;
  glue.knee.value = 10;
  glue.ratio.value = 3;
  glue.attack.value = 0.01;
  glue.release.value = 0.18;
  const sat = ctx.createWaveShaper();
  {
    const curve = new Float32Array(2048);
    const k = 1.8;
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    sat.curve = curve;
    sat.oversample = '4x';
  }
  const pre = ctx.createGain();
  pre.gain.value = 0.8;
  pre.connect(sat).connect(glue).connect(limiter).connect(out).connect(dest);

  // Music bus with a sweepable low-pass (build-ups, half-time break)
  const musicLP = ctx.createBiquadFilter();
  musicLP.type = 'lowpass';
  musicLP.frequency.value = 18000;
  musicLP.Q.value = 0.9;
  const music = ctx.createGain();
  music.connect(musicLP).connect(pre);

  // Pads go through a side-chain gain that ducks on every kick
  const duck = ctx.createGain();
  duck.connect(music);

  const sfx = ctx.createGain();
  sfx.gain.value = 0.9;
  sfx.connect(pre);

  // Stereo reverb (generated hall), high-passed so the low end stays clean
  const verbIn = ctx.createGain();
  const verbHP = ctx.createBiquadFilter();
  verbHP.type = 'highpass';
  verbHP.frequency.value = 320;
  const preDelay = ctx.createDelay(0.1);
  preDelay.delayTime.value = 0.025;
  const convolver = ctx.createConvolver();
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.38;
  {
    const len = Math.floor(SR * 3.2);
    const ir = ctx.createBuffer(2, len, SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const tt = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - tt, 3.2) * (i < SR * 0.004 ? i / (SR * 0.004) : 1);
      }
    }
    convolver.buffer = ir;
  }
  verbIn.connect(verbHP).connect(preDelay).connect(convolver).connect(verbOut).connect(pre);

  // Dotted-eighth ping delay for the lead
  const delayIn = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const fbLP = ctx.createBiquadFilter();
  fbLP.type = 'lowpass';
  fbLP.frequency.value = 3800;
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.4;
  delayIn.connect(delay);
  delay.connect(fbLP).connect(fb).connect(delay);
  delay.connect(delayOut).connect(music);
  delayOut.connect(verbIn);

  // Shared noise
  const noise = ctx.createBuffer(1, SR * 2, SR);
  {
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const panner = (pan: number, to: AudioNode): AudioNode => {
    if (typeof ctx.createStereoPanner !== 'function') return to;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(to);
    return p;
  };

  function env(g: GainNode, start: number, attack: number, peak: number, release: number, hold = 0) {
    const s = at(start);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), s + Math.max(0.002, attack));
    if (hold > 0) g.gain.setValueAtTime(Math.max(0.0002, peak), s + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, s + attack + hold + release);
  }

  function send(from: AudioNode, to: AudioNode, amount: number) {
    const g = ctx.createGain();
    g.gain.value = amount;
    from.connect(g).connect(to);
  }

  function noiseHit(sec: number, o: { type: BiquadFilterType; freq: number; q?: number; level: number; release: number; attack?: number; verb?: number; pan?: number; bus?: AudioNode }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.value = o.freq;
    f.Q.value = o.q ?? 0.7;
    const g = ctx.createGain();
    env(g, sec, o.attack ?? 0.002, o.level, o.release);
    src.connect(f).connect(g);
    g.connect(panner(o.pan ?? 0, o.bus ?? music));
    if (o.verb) send(g, verbIn, o.verb);
    src.start(at(sec), Math.random() * 1.5, (o.attack ?? 0.002) + o.release + 0.05);
  }

  // ---- Drums -----------------------------------------------------------------------------------
  function kick(sec: number, level = 1) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, at(sec));
    o.frequency.exponentialRampToValueAtTime(48, at(sec) + 0.09);
    o.frequency.exponentialRampToValueAtTime(40, at(sec) + 0.35);
    const g = ctx.createGain();
    env(g, sec, 0.002, level, 0.38);
    o.connect(g).connect(music);
    o.start(at(sec));
    o.stop(at(sec) + 0.5);
    noiseHit(sec, { type: 'highpass', freq: 3200, level: level * 0.16, release: 0.018 });
    // side-chain the pads
    duck.gain.cancelScheduledValues(at(sec));
    duck.gain.setValueAtTime(0.28, at(sec));
    duck.gain.linearRampToValueAtTime(1, at(sec) + BEAT * 0.62);
  }

  function snare(sec: number, level = 0.5, pitch = 1) {
    noiseHit(sec, { type: 'bandpass', freq: 1900 * pitch, q: 0.8, level, release: 0.17, verb: 0.35 });
    noiseHit(sec + 0.008, { type: 'highpass', freq: 5200, level: level * 0.5, release: 0.09 });
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220 * pitch, at(sec));
    o.frequency.exponentialRampToValueAtTime(160 * pitch, at(sec) + 0.08);
    const g = ctx.createGain();
    env(g, sec, 0.002, level * 0.45, 0.1);
    o.connect(g).connect(music);
    o.start(at(sec));
    o.stop(at(sec) + 0.2);
  }

  const hat = (sec: number, level = 0.12, pan = 0) => noiseHit(sec, { type: 'highpass', freq: 9500, level, release: 0.035, pan });
  const openHat = (sec: number, level = 0.08) => noiseHit(sec, { type: 'highpass', freq: 8000, level, release: 0.22, pan: 0.25 });
  const crash = (sec: number, level = 0.38, release = 2.4) =>
    noiseHit(sec, { type: 'highpass', freq: 4800, level, release, attack: 0.004, verb: 0.55, bus: sfx });

  // ---- Bass & harmony --------------------------------------------------------------------------
  /** 808: sine with glide and saturation, plus a harmonic so phones can hear it. */
  function bass808(sec: number, dur: number, freq: number, level = 0.5, glideFrom?: number) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    if (glideFrom) {
      o.frequency.setValueAtTime(glideFrom, at(sec));
      o.frequency.exponentialRampToValueAtTime(freq, at(sec) + 0.09);
    } else {
      o.frequency.setValueAtTime(freq, at(sec));
    }
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / 511) * 2 - 1;
      curve[i] = Math.tanh(2.6 * x);
    }
    shaper.curve = curve;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(sec));
    g.gain.exponentialRampToValueAtTime(level, at(sec) + 0.006);
    g.gain.exponentialRampToValueAtTime(level * 0.55, at(sec) + Math.min(dur, 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, at(sec) + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    o.connect(shaper).connect(lp).connect(g).connect(music);
    o.start(at(sec));
    o.stop(at(sec) + dur + 0.05);
  }

  /** Wide supersaw pad into the side-chain and the hall. */
  function pad(sec: number, dur: number, notes: readonly number[], level = 0.05, cutoff = 2200, attack = 0.4) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(cutoff * 0.4, at(sec));
    lp.frequency.linearRampToValueAtTime(cutoff, at(sec) + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(sec));
    g.gain.linearRampToValueAtTime(level, at(sec) + Math.min(attack, dur * 0.5));
    g.gain.setValueAtTime(level, at(sec) + Math.max(attack, dur - 0.3));
    g.gain.linearRampToValueAtTime(0.0001, at(sec) + dur + 0.4);
    lp.connect(g).connect(duck);
    send(g, verbIn, 0.5);
    notes.forEach((f, ni) => {
      [-12, 0, 11].forEach((detune, di) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = detune;
        o.connect(panner((di - 1) * 0.6 * (ni % 2 === 0 ? 1 : -1), lp));
        o.start(at(sec));
        o.stop(at(sec) + dur + 0.5);
      });
    });
  }

  /** Plucked lead through the dotted-eighth delay. */
  function pluck(sec: number, freq: number, level = 0.07, pan = 0) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(5200, at(sec));
    lp.frequency.exponentialRampToValueAtTime(700, at(sec) + 0.22);
    const g = ctx.createGain();
    env(g, sec, 0.003, level, 0.26);
    lp.connect(g);
    g.connect(panner(pan, music));
    send(g, delayIn, 0.55);
    for (const [type, mult, det] of [
      ['triangle', 1, 0],
      ['square', 1, 7],
      ['sine', 2, 0],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = type === 'square' ? 0.35 : type === 'sine' ? 0.4 : 1;
      o.connect(og).connect(lp);
      o.start(at(sec));
      o.stop(at(sec) + 0.4);
    }
  }

  /** FM bell for the brand card. */
  function bell(sec: number, freq: number, level = 0.12, pan = 0) {
    const car = ctx.createOscillator();
    car.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq * 3.5;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(freq * 2.2, at(sec));
    modGain.gain.exponentialRampToValueAtTime(1, at(sec) + 1.4);
    mod.connect(modGain).connect(car.frequency);
    const g = ctx.createGain();
    env(g, sec, 0.004, level, 2.2);
    car.connect(g);
    g.connect(panner(pan, music));
    send(g, verbIn, 0.8);
    car.start(at(sec));
    mod.start(at(sec));
    car.stop(at(sec) + 2.5);
    mod.stop(at(sec) + 2.5);
  }

  // ---- Cinematic FX -----------------------------------------------------------------------------
  /** Trailer "braam" + sub boom: the drop. */
  function impact(sec: number, level = 1) {
    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(78, at(sec));
    boom.frequency.exponentialRampToValueAtTime(24, at(sec) + 1.8);
    const bg = ctx.createGain();
    env(bg, sec, 0.004, level * 0.95, 2.2);
    boom.connect(bg).connect(sfx);
    boom.start(at(sec));
    boom.stop(at(sec) + 2.4);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(180, at(sec));
    lp.frequency.exponentialRampToValueAtTime(1400, at(sec) + 0.25);
    lp.frequency.exponentialRampToValueAtTime(260, at(sec) + 2.2);
    const brg = ctx.createGain();
    env(brg, sec, 0.02, level * 0.26, 2.4);
    lp.connect(brg).connect(sfx);
    send(brg, verbIn, 0.4);
    for (const [f, d] of [
      [55, -8],
      [55, 8],
      [110, -5],
      [110, 6],
      [82.41, 0],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(lp);
      o.start(at(sec));
      o.stop(at(sec) + 2.6);
    }
    noiseHit(sec, { type: 'lowpass', freq: 1100, level: level * 0.5, release: 1.0, verb: 0.6, bus: sfx });
    crash(sec, 0.36 * level, 2.6);
  }

  /** Reverse cymbal swelling into `endSec`. */
  function reverseSwell(startSec: number, endSec: number, level = 0.3) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(9000, at(startSec));
    f.frequency.exponentialRampToValueAtTime(3000, at(endSec));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(startSec));
    g.gain.exponentialRampToValueAtTime(level, at(endSec) - 0.01);
    g.gain.linearRampToValueAtTime(0.0001, at(endSec) + 0.01);
    src.connect(f).connect(g).connect(sfx);
    send(g, verbIn, 0.3);
    src.start(at(startSec));
    src.stop(at(endSec) + 0.05);
  }

  function riser(startSec: number, endSec: number, level = 0.4) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.4;
    f.frequency.setValueAtTime(300, at(startSec));
    f.frequency.exponentialRampToValueAtTime(9500, at(endSec));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(startSec));
    g.gain.exponentialRampToValueAtTime(level, at(endSec) - 0.04);
    g.gain.linearRampToValueAtTime(0.0001, at(endSec));
    src.connect(f).connect(g).connect(sfx);
    send(g, verbIn, 0.25);
    src.start(at(startSec));
    src.stop(at(endSec) + 0.05);

    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, at(startSec));
    o.frequency.exponentialRampToValueAtTime(1320, at(endSec));
    const olp = ctx.createBiquadFilter();
    olp.type = 'lowpass';
    olp.frequency.setValueAtTime(500, at(startSec));
    olp.frequency.exponentialRampToValueAtTime(6000, at(endSec));
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, at(startSec));
    og.gain.exponentialRampToValueAtTime(level * 0.22, at(endSec) - 0.04);
    og.gain.linearRampToValueAtTime(0.0001, at(endSec));
    o.connect(olp).connect(og).connect(sfx);
    o.start(at(startSec));
    o.stop(at(endSec) + 0.05);
  }

  function whoosh(sec: number, dur = 0.3, level = 0.3, pan = 0) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(420, at(sec));
    f.frequency.exponentialRampToValueAtTime(7200, at(sec) + dur * 0.8);
    f.frequency.exponentialRampToValueAtTime(2200, at(sec) + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(sec));
    g.gain.exponentialRampToValueAtTime(level, at(sec) + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, at(sec) + dur + 0.06);
    src.connect(f).connect(g).connect(panner(pan, sfx));
    send(g, verbIn, 0.15);
    src.start(at(sec), Math.random(), dur + 0.15);
  }

  function tick(sec: number, level = 0.12, pitch = 1) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(2400 * pitch, at(sec));
    o.frequency.exponentialRampToValueAtTime(900 * pitch, at(sec) + 0.03);
    const g = ctx.createGain();
    env(g, sec, 0.001, level, 0.035);
    o.connect(g).connect(sfx);
    o.start(at(sec));
    o.stop(at(sec) + 0.06);
    noiseHit(sec, { type: 'highpass', freq: 7000, level: level * 0.8, release: 0.02, bus: sfx });
  }

  function thump(sec: number, level = 0.5) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, at(sec));
    o.frequency.exponentialRampToValueAtTime(38, at(sec) + 0.25);
    const g = ctx.createGain();
    env(g, sec, 0.003, level, 0.45);
    o.connect(g).connect(sfx);
    o.start(at(sec));
    o.stop(at(sec) + 0.55);
  }

  /** Tape-stop: everything pitches down into the half-time break. */
  function tapeStop(sec: number, dur = 0.45) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, at(sec));
    o.frequency.exponentialRampToValueAtTime(28, at(sec) + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, at(sec));
    lp.frequency.exponentialRampToValueAtTime(120, at(sec) + dur);
    const g = ctx.createGain();
    env(g, sec, 0.005, 0.18, dur);
    o.connect(lp).connect(g).connect(sfx);
    o.start(at(sec));
    o.stop(at(sec) + dur + 0.05);
  }

  /** Dark ambience: sub drone + filtered wind. */
  function drone(startSec: number, dur: number, freq: number, level = 0.18) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(startSec));
    g.gain.exponentialRampToValueAtTime(level, at(startSec) + 0.6);
    g.gain.setValueAtTime(level, at(startSec) + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, at(startSec) + dur);
    o.connect(g).connect(music);
    o.start(at(startSec));
    o.stop(at(startSec) + dur + 0.05);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(500, at(startSec));
    f.frequency.linearRampToValueAtTime(1400, at(startSec) + dur);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, at(startSec));
    wg.gain.linearRampToValueAtTime(0.05, at(startSec) + dur * 0.6);
    wg.gain.linearRampToValueAtTime(0.0001, at(startSec) + dur);
    src.connect(f).connect(wg).connect(sfx);
    send(wg, verbIn, 0.4);
    src.start(at(startSec));
    src.stop(at(startSec) + dur + 0.05);
  }

  // ---- Arrangement ----------------------------------------------------------------------------
  function schedule() {
    const shots = buildShotList(angleCount);
    const lp = musicLP.frequency;

    // OPEN 0 – 2: drone, flicker ticks, swell into the hero reveal
    lp.setValueAtTime(700, at(0));
    drone(0, T_OPEN_END + 0.2, 55, 0.2);
    pad(0, T_OPEN_END + 0.3, [220, 329.63], 0.04, 900, 0.8);
    reverseSwell(0.35, 1.0, 0.22);
    bell(1.0, 659.25, 0.07, -0.2);
    thump(1.0, 0.45);

    // BUILD 2 – 4: four-on-the-floor opens up, snare roll, riser, a breath before the drop
    lp.setValueAtTime(700, at(T_OPEN_END));
    lp.exponentialRampToValueAtTime(16000, at(T_DROP - 0.05));
    for (let b = 0; b < 4; b++) kick(T_OPEN_END + b * BEAT, 0.75);
    for (const [from, to, step] of [
      [T_OPEN_END + 2 * BEAT, T_OPEN_END + 3 * BEAT, BEAT / 2],
      [T_OPEN_END + 3 * BEAT, T_DROP - 0.25, BEAT / 4],
      [T_DROP - 0.25, T_DROP - 0.08, BEAT / 8],
    ] as const) {
      for (let s = from; s < to - 1e-6; s += step) snare(s, 0.16 + ((s - T_OPEN_END) / 2) * 0.2, 1 + (s - T_OPEN_END) * 0.12);
    }
    riser(T_OPEN_END, T_DROP - 0.06, 0.38);
    pad(T_OPEN_END, T_DROP - T_OPEN_END, CHORDS[3].notes, 0.045, 3200, 0.3);
    bass808(T_OPEN_END, 2 * BEAT, CHORDS[3].root, 0.38);
    // breath: the music drops out for an instant
    music.gain.setValueAtTime(1, at(T_DROP - 0.09));
    music.gain.linearRampToValueAtTime(0.0001, at(T_DROP - 0.06));
    music.gain.setValueAtTime(1, at(T_DROP));

    // DROP 4.0
    impact(T_DROP, 1);
    kick(T_DROP, 1);
    snare(T_DROP, 0.5);

    // DRIVE 4 – 10: drums, 808, side-chained pad, delayed pluck lead
    lp.setValueAtTime(18000, at(T_DROP));
    const beats = Math.round((T_DRIVE_END - T_DROP) / BEAT);
    for (let b = 0; b < beats; b++) {
      const tb = T_DROP + b * BEAT;
      const chord = CHORDS[Math.floor(b / 4) % CHORDS.length]!;
      if (b > 0) kick(tb, 0.95);
      if (b % 2 === 1) snare(tb, 0.42);
      hat(tb + BEAT / 2, 0.13, 0.3);
      hat(tb + BEAT / 4, 0.06, -0.3);
      hat(tb + (3 * BEAT) / 4, 0.06, 0.3);
      if (b % 4 === 3) {
        for (let r = 0; r < 4; r++) hat(tb + BEAT / 2 + r * (BEAT / 8), 0.05 + r * 0.02, r % 2 ? 0.4 : -0.4);
      }
      if (b % 4 === 1) openHat(tb + BEAT / 2);
      // 808 pattern: root, push on the "and", octave hop with glide
      const step = b % 4;
      if (step === 0) bass808(tb, BEAT * 1.4, chord.root, 0.5);
      if (step === 1) bass808(tb + BEAT / 2, BEAT * 0.45, chord.root, 0.42);
      if (step === 2) bass808(tb, BEAT * 0.9, chord.root * 2, 0.4, chord.root);
      if (step === 3) bass808(tb + BEAT / 2, BEAT * 0.45, chord.root * 1.5, 0.38);
      // lead: chord-tone arpeggio in eighths
      pluck(tb, (ARP[(b * 2) % ARP.length] ?? 440) * (chord.notes[0]! / 220), 0.06, -0.25);
      pluck(tb + BEAT / 2, (ARP[(b * 2 + 1) % ARP.length] ?? 523.25) * (chord.notes[0]! / 220), 0.05, 0.25);
    }
    for (let c = 0; c * 4 < beats; c++) pad(T_DROP + c * 4 * BEAT, 4 * BEAT, CHORDS[c % CHORDS.length]!.notes, 0.05, 3000, 0.08);

    // Cut sounds, straight from the shot list
    for (const s of shots) {
      if (s.start <= 0.01) continue;
      if (s.transition === 'whip') whoosh(s.start - 0.14, 0.24, 0.26, s.dir * 0.5);
      if (s.transition === 'glitch') tick(s.start, 0.1, s.section === 'stutter' ? 1.3 : 1);
      if (s.transition === 'zoom') thump(s.start, 0.35);
      if (s.section === 'open' && s.transition === 'fade' && s.dur <= BEAT) tick(s.start, 0.07, 0.7);
    }

    // BREAK 10 – 12: tape-stop into half time, filtered, swelling strings
    tapeStop(T_DRIVE_END - 0.12, 0.4);
    lp.setValueAtTime(18000, at(T_DRIVE_END - 0.05));
    lp.exponentialRampToValueAtTime(650, at(T_DRIVE_END + 0.1));
    lp.setValueAtTime(650, at(T_BREAK_END - 1.0));
    lp.exponentialRampToValueAtTime(14000, at(T_BREAK_END - 0.05));
    kick(T_DRIVE_END, 0.8);
    snare(T_DRIVE_END + 2 * BEAT, 0.4);
    kick(T_DRIVE_END + 3 * BEAT, 0.6);
    bass808(T_DRIVE_END, 4 * BEAT, CHORDS[3].root, 0.45, CHORDS[3].root * 1.5);
    pad(T_DRIVE_END, T_BREAK_END - T_DRIVE_END, [...CHORDS[3].notes, 587.33], 0.07, 2400, 0.9);
    bell(T_DRIVE_END + 0.5, 987.77, 0.05, 0.3);
    reverseSwell(T_BREAK_END - 1.0, T_BREAK_END, 0.3);
    riser(T_BREAK_END - 0.9, T_BREAK_END, 0.25);

    // STUTTER 12 – 13: rolling snare, rising pitch, breath, hit
    kick(T_BREAK_END, 0.95);
    kick(T_BREAK_END + BEAT, 0.9);
    for (let s = 0; s < 14; s++) snare(T_BREAK_END + s * (BEAT / 8), 0.22 + s * 0.02, 1 + s * 0.05);
    bass808(T_BREAK_END, 2 * BEAT, CHORDS[0].root, 0.45);
    music.gain.setValueAtTime(1, at(T_OUTRO - 0.08));
    music.gain.linearRampToValueAtTime(0.0001, at(T_OUTRO - 0.05));
    music.gain.setValueAtTime(1, at(T_OUTRO));

    // OUTRO 13 – 16: final braam, long Am(add9), bells, tail
    impact(T_OUTRO, 1);
    kick(T_OUTRO, 1);
    bass808(T_OUTRO, 2.6, CHORDS[0].root, 0.5);
    pad(T_OUTRO, REEL_DURATION - T_OUTRO, [220, 246.94, 329.63, 523.25], 0.065, 2600, 0.2);
    [880, 1046.5, 1318.5, 1760].forEach((f, i) => bell(T_OUTRO + 0.12 + i * 0.16, f, 0.08, i % 2 ? 0.35 : -0.35));
    bell(T_OUTRO + 1.4, 1318.5, 0.05, 0);

    out.gain.setValueAtTime(0.92, at(REEL_DURATION - 1.2));
    out.gain.linearRampToValueAtTime(0.0001, at(REEL_DURATION - 0.02));
  }

  return {
    stream: dest.stream,
    start: () => {
      if (started) return;
      started = true;
      void ctx.resume();
      t0 = ctx.currentTime + 0.12;
      schedule();
    },
    currentTime: () => (started ? Math.max(0, ctx.currentTime - t0) : 0),
    isRunning: () => ctx.state === 'running',
    close: () => {
      void ctx.close().catch(() => undefined);
    },
  };
}
