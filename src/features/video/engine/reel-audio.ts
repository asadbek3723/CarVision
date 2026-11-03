import { BEAT, REEL_DURATION, T_BA_END, T_INTRO_END, T_SCAN_END, T_SHOW_END, angleDuration } from './reel-timeline';

/**
 * Procedural cinematic score, synthesised with the Web Audio API (no audio files,
 * no licensing, zero cost). Everything is scheduled against the audio clock so the
 * picture can follow `currentTime()` and stay frame-locked to every hit.
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

const A_MINOR = [110, 130.81, 164.81, 220];
const F_MAJOR = [87.31, 130.81, 174.61, 220];
const C_MAJOR = [130.81, 164.81, 196, 261.63];
const G_MAJOR = [98, 146.83, 196, 246.94];

const BASS_ROOTS = { Am: 55, F: 43.65, C: 65.41, G: 49 } as const;

export function createReelAudio(angleCount: number): ReelAudio | null {
  const Ctor: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctor) return null;

  let ctx: AudioContext;
  let dest: MediaStreamAudioDestinationNode;
  try {
    ctx = new Ctor();
    dest = ctx.createMediaStreamDestination();
  } catch {
    return null;
  }

  let t0 = 0;
  let started = false;

  // ---- Master chain -------------------------------------------------------------------
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  master.connect(comp);
  comp.connect(dest);

  // Reverb send (generated impulse response)
  const reverbIn = ctx.createGain();
  const convolver = ctx.createConvolver();
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.32;
  {
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    convolver.buffer = ir;
  }
  reverbIn.connect(convolver);
  convolver.connect(reverbOut);
  reverbOut.connect(master);

  // Shared noise buffer
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  {
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // ---- Instruments ----------------------------------------------------------------------
  const at = (sec: number) => t0 + sec;

  function envGain(startSec: number, attack: number, peak: number, release: number, hold = 0): GainNode {
    const g = ctx.createGain();
    const s = at(startSec);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), s + Math.max(0.002, attack));
    if (hold > 0) g.gain.setValueAtTime(Math.max(0.0002, peak), s + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, s + attack + hold + release);
    return g;
  }

  function kick(sec: number, level = 0.95) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, at(sec));
    osc.frequency.exponentialRampToValueAtTime(42, at(sec) + 0.14);
    const g = envGain(sec, 0.003, level, 0.34);
    osc.connect(g).connect(master);
    osc.start(at(sec));
    osc.stop(at(sec) + 0.5);
    // click
    const click = ctx.createBufferSource();
    click.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const cg = envGain(sec, 0.001, level * 0.18, 0.02);
    click.connect(hp).connect(cg).connect(master);
    click.start(at(sec), 0, 0.05);
  }

  function noiseHit(sec: number, opts: { type: BiquadFilterType; freq: number; q?: number; level: number; release: number; attack?: number; reverb?: number }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.value = opts.freq;
    f.Q.value = opts.q ?? 0.7;
    const g = envGain(sec, opts.attack ?? 0.002, opts.level, opts.release);
    src.connect(f).connect(g);
    g.connect(master);
    if (opts.reverb) {
      const send = ctx.createGain();
      send.gain.value = opts.reverb;
      g.connect(send).connect(reverbIn);
    }
    src.start(at(sec), Math.random(), opts.release + (opts.attack ?? 0.002) + 0.05);
  }

  const hat = (sec: number, level = 0.16) => noiseHit(sec, { type: 'highpass', freq: 8200, level, release: 0.05 });
  const clap = (sec: number, level = 0.5) => {
    noiseHit(sec, { type: 'bandpass', freq: 1700, q: 0.9, level, release: 0.16, reverb: 0.5 });
    noiseHit(sec + 0.012, { type: 'bandpass', freq: 2300, q: 1.2, level: level * 0.7, release: 0.1 });
  };
  const crash = (sec: number, level = 0.4, release = 1.8) =>
    noiseHit(sec, { type: 'highpass', freq: 5200, level, release, attack: 0.005, reverb: 0.6 });

  function boom(sec: number, level = 1.0) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, at(sec));
    osc.frequency.exponentialRampToValueAtTime(28, at(sec) + 1.6);
    const g = envGain(sec, 0.004, level, 2.0);
    osc.connect(g).connect(master);
    const send = ctx.createGain();
    send.gain.value = 0.25;
    g.connect(send).connect(reverbIn);
    osc.start(at(sec));
    osc.stop(at(sec) + 2.3);
    noiseHit(sec, { type: 'lowpass', freq: 900, level: level * 0.55, release: 0.9, reverb: 0.6 });
  }

  function whoosh(sec: number, dur = 0.38, level = 0.34) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(380, at(sec));
    f.frequency.exponentialRampToValueAtTime(6800, at(sec) + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(sec));
    g.gain.exponentialRampToValueAtTime(level, at(sec) + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at(sec) + dur + 0.08);
    src.connect(f).connect(g).connect(master);
    src.start(at(sec), Math.random(), dur + 0.2);
  }

  function riser(startSec: number, endSec: number, level = 0.5) {
    const dur = endSec - startSec;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.2;
    f.frequency.setValueAtTime(260, at(startSec));
    f.frequency.exponentialRampToValueAtTime(9000, at(endSec));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(startSec));
    g.gain.exponentialRampToValueAtTime(level, at(endSec) - 0.05);
    g.gain.linearRampToValueAtTime(0.0001, at(endSec) + 0.02);
    src.connect(f).connect(g).connect(master);
    src.start(at(startSec));
    src.stop(at(endSec) + 0.1);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, at(startSec));
    osc.frequency.exponentialRampToValueAtTime(1760, at(endSec));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, at(startSec));
    lp.frequency.exponentialRampToValueAtTime(7000, at(endSec));
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, at(startSec));
    og.gain.exponentialRampToValueAtTime(level * 0.32 + 0.0001, at(endSec) - 0.05);
    og.gain.linearRampToValueAtTime(0.0001, at(endSec) + 0.02);
    osc.connect(lp).connect(og).connect(master);
    osc.start(at(startSec));
    osc.stop(at(startSec) + dur + 0.1);
  }

  function pad(startSec: number, dur: number, notes: number[], level = 0.07, cutoff = 1500) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(cutoff * 0.35, at(startSec));
    lp.frequency.linearRampToValueAtTime(cutoff, at(startSec) + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(startSec));
    g.gain.linearRampToValueAtTime(level, at(startSec) + Math.min(0.5, dur * 0.3));
    g.gain.setValueAtTime(level, at(startSec) + dur - 0.35);
    g.gain.linearRampToValueAtTime(0.0001, at(startSec) + dur + 0.25);
    lp.connect(g);
    g.connect(master);
    const send = ctx.createGain();
    send.gain.value = 0.45;
    g.connect(send).connect(reverbIn);
    for (const f of notes) {
      for (const detune of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = detune;
        o.connect(lp);
        o.start(at(startSec));
        o.stop(at(startSec) + dur + 0.3);
      }
    }
  }

  function subBass(sec: number, dur: number, freq: number, level = 0.42) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at(sec));
    g.gain.exponentialRampToValueAtTime(level, at(sec) + 0.012);
    g.gain.exponentialRampToValueAtTime(level * 0.45, at(sec) + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, at(sec) + dur);
    o.connect(g).connect(master);
    o.start(at(sec));
    o.stop(at(sec) + dur + 0.05);
    // harmonic for small speakers
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, at(sec));
    g2.gain.exponentialRampToValueAtTime(level * 0.28, at(sec) + 0.012);
    g2.gain.exponentialRampToValueAtTime(0.0001, at(sec) + dur * 0.8);
    o2.connect(g2).connect(master);
    o2.start(at(sec));
    o2.stop(at(sec) + dur + 0.05);
  }

  function chime(sec: number, freq: number, level = 0.22) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = envGain(sec, 0.004, level, 1.6);
    o.connect(g).connect(master);
    const send = ctx.createGain();
    send.gain.value = 0.7;
    g.connect(send).connect(reverbIn);
    o.start(at(sec));
    o.stop(at(sec) + 1.8);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.01;
    const g2 = envGain(sec, 0.003, level * 0.35, 0.9);
    o2.connect(g2).connect(reverbIn);
    o2.start(at(sec));
    o2.stop(at(sec) + 1);
  }

  // ---- Arrangement -------------------------------------------------------------------------
  function schedule() {
    // PROLOGUE (0 - 2.0): sub drone, pulse of a heartbeat, dark pad
    subBass(0.0, 2.0, BASS_ROOTS.Am, 0.3);
    pad(0, T_INTRO_END + 0.2, [A_MINOR[0]!, A_MINOR[2]!], 0.05, 700);
    kick(0.5, 0.35);
    kick(1.0, 0.45);
    kick(1.5, 0.35);
    whoosh(0.1, 0.9, 0.12);

    // SCAN (2.0 - 3.5): riser + accelerating snare roll
    riser(T_INTRO_END, T_SCAN_END, 0.55);
    for (const s of [2.0, 2.5, 2.85, 3.1, 3.25, 3.35, 3.42, 3.46]) clap(s, 0.28);
    pad(T_INTRO_END, T_SCAN_END - T_INTRO_END + 0.1, [A_MINOR[1]!, A_MINOR[3]!], 0.05, 3800);

    // IMPACT (3.5)
    boom(T_SCAN_END, 1.0);
    crash(T_SCAN_END, 0.5, 2.2);
    kick(T_SCAN_END, 1.0);

    // SHOWCASE (3.5 - 11.0): four-on-the-floor, offbeat hats, claps on 2 & 4, chord pad, bass
    const beats = Math.round((T_SHOW_END - T_SCAN_END) / BEAT);
    const chords: Array<{ notes: number[]; root: number }> = [
      { notes: A_MINOR, root: BASS_ROOTS.Am },
      { notes: F_MAJOR, root: BASS_ROOTS.F },
      { notes: C_MAJOR, root: BASS_ROOTS.C },
      { notes: G_MAJOR, root: BASS_ROOTS.G },
    ];
    for (let b = 0; b < beats; b++) {
      const t = T_SCAN_END + b * BEAT;
      if (b > 0) kick(t, 0.9);
      hat(t + BEAT / 2, b % 2 === 0 ? 0.17 : 0.12);
      if (b % 2 === 1) clap(t, 0.38);
      const chord = chords[Math.floor(b / 4) % chords.length]!;
      subBass(t + BEAT / 2, BEAT * 0.5, chord.root, 0.34);
      if (b % 4 === 0) subBass(t, BEAT * 0.9, chord.root, 0.36);
    }
    for (let c = 0; c < 4; c++) {
      const start = T_SCAN_END + c * 4 * BEAT;
      if (start >= T_SHOW_END) break;
      pad(start, 4 * BEAT, chords[c]!.notes, 0.075, 2600);
    }

    // Angle cuts: whoosh into every new angle
    const dur = angleDuration(angleCount);
    for (let i = 1; i < angleCount; i++) whoosh(T_SCAN_END + i * dur - 0.12, 0.34, 0.3);

    // BEFORE / AFTER (11.0 - 13.0): stripped back, rising tension, wipe whooshes
    whoosh(T_SHOW_END - 0.05, 0.5, 0.4);
    kick(T_SHOW_END, 0.8);
    pad(T_SHOW_END, T_BA_END - T_SHOW_END, [A_MINOR[0]!, A_MINOR[1]!, A_MINOR[2]!], 0.08, 3200);
    subBass(T_SHOW_END, 2.0, BASS_ROOTS.Am, 0.34);
    kick(11.5, 0.45);
    kick(12.0, 0.5);
    kick(12.5, 0.55);
    whoosh(11.5, 0.8, 0.28);
    riser(12.2, T_BA_END, 0.4);
    hat(11.25, 0.1);
    hat(11.75, 0.1);
    hat(12.25, 0.12);
    hat(12.75, 0.14);

    // OUTRO (13.0 - 16.0): final hit, chime arpeggio, long tail
    boom(T_BA_END, 1.0);
    crash(T_BA_END, 0.45, 2.6);
    kick(T_BA_END, 1.0);
    pad(T_BA_END, REEL_DURATION - T_BA_END, [A_MINOR[1]!, A_MINOR[2]!, A_MINOR[3]!, 329.63], 0.08, 2200);
    subBass(T_BA_END, 2.8, BASS_ROOTS.Am, 0.32);
    [880, 1046.5, 1318.5, 1760].forEach((f, i) => chime(T_BA_END + 0.08 + i * 0.14, f, 0.2));
    chime(14.3, 1318.5, 0.12);

    // Master fade-out
    master.gain.setValueAtTime(0.9, at(REEL_DURATION - 0.9));
    master.gain.linearRampToValueAtTime(0.0001, at(REEL_DURATION - 0.02));
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
