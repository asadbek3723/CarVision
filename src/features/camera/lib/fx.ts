/**
 * Vibratsiya va WebAudio tovush sintezi (tashqi mp3 fayllarsiz).
 * iOS Safari uchun AudioContext unlock va haptic fallbacks.
 */

const MUTE_KEY = 'carvision_capture_muted';

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* noop */
  }
}

let iosSwitch: HTMLLabelElement | null = null;

/**
 * iPhone Safari has no Vibration API. Since iOS 18, toggling a native `<input type="checkbox" switch>`
 * plays the system haptic, so a hidden one is clicked instead (works while the user is touching).
 */
function iosHaptic(): void {
  if (typeof document === 'undefined') return;
  try {
    if (!iosSwitch) {
      const label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:0';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      iosSwitch = label;
    }
    iosSwitch.click();
  } catch {
    /* noop */
  }
}

/**
 * Haptic tap. Not tied to "Reduce motion": that setting is about movement on screen, and turning
 * it on used to silence every vibration in the app (the parts wheel included).
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
    return;
  }
  iosHaptic();
}

/**
 * One tap for iPhone at the moment the finger lifts. iOS has no Vibration API and only lets the
 * switch haptic through inside a real tap (touch end / click), never during a drag or a spin, so
 * the per-notch ticks cannot be felt there; this is the one moment that is. No-op on Android,
 * which already feels every notch.
 */
export function hapticOnRelease(): void {
  if (typeof navigator === 'undefined' || 'vibrate' in navigator) return;
  iosHaptic();
}

let audio: AudioContext | null = null;

/** Birinchi foydalanuvchi bosishida chaqiriladi (browser autoplay policy unlock) */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* noop */
  }
}

function tone(freq: number, durationMs: number, gain = 0.06, type: OscillatorType = 'sine', delayMs = 0) {
  if (!audio || isMuted()) return;
  try {
    const t0 = audio.currentTime + delayMs / 1000;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
    osc.connect(g).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + durationMs / 1000 + 0.02);
  } catch {
    /* noop */
  }
}

/** LOCK: yumshoq "tik" va taktil tebranish */
export function playLock(): void {
  tone(880, 60, 0.06);
  vibrate(12);
}

/** Suratga olish: qisqa shutter shovqin + past ohang */
export function playShutter(): void {
  if (audio && !isMuted()) {
    try {
      const len = Math.floor(audio.sampleRate * 0.03);
      const buffer = audio.createBuffer(1, len, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.createBufferSource();
      const g = audio.createGain();
      g.gain.value = 0.12;
      src.buffer = buffer;
      src.connect(g).connect(audio.destination);
      src.start();
      tone(180, 90, 0.06, 'triangle', 10);
    } catch {
      /* noop */
    }
  }
  vibrate([18, 40, 18]);
}

let lastTick = 0;
let lastHaptic = 0;

/** Pulse lengths (ms) of one wheel notch. 8 ms is below what most phone motors can show. */
const NOTCH_SLOW_MS = 16;
const NOTCH_FAST_MS = 11;
/** Notches closer than this share one pulse, so a fast spin stays a soft patter, not a buzz. */
const NOTCH_MIN_GAP_MS = 50;
/** Spinning faster than this (notch every < 110 ms) gets the shorter, lighter pulse. */
const NOTCH_FAST_GAP_MS = 110;

/**
 * Ratchet "tick" for the parts wheel: a very short, quiet, high-passed click (like a gear tooth),
 * plus a soft haptic tap you can feel in the hand on every notch. Slow turns give a slightly fuller
 * tap, fast spins a lighter one, and pulses never overlap. Rate-limited so a spin does not turn
 * into noise.
 */
export function playTick(): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastTick < 28) return;
  lastTick = now;
  const gap = now - lastHaptic;
  if (gap >= NOTCH_MIN_GAP_MS) {
    lastHaptic = now;
    vibrate(gap < NOTCH_FAST_GAP_MS ? NOTCH_FAST_MS : NOTCH_SLOW_MS);
  }
  if (!audio || isMuted()) return;
  try {
    const len = Math.floor(audio.sampleRate * 0.012);
    const buffer = audio.createBuffer(1, len, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = audio.createBufferSource();
    const hp = audio.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const g = audio.createGain();
    g.gain.value = 0.05;
    src.buffer = buffer;
    src.connect(hp).connect(g).connect(audio.destination);
    src.start();
  } catch {
    /* noop */
  }
}

export function playError(): void {
  tone(220, 120, 0.06, 'square');
  vibrate([40]);
}
