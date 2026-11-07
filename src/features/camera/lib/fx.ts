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

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || reducedMotion()) return;
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

/**
 * Ratchet "tick" for the parts wheel: a very short, quiet, high-passed click (like a gear tooth),
 * plus a light haptic. Rate-limited so a fast spin does not turn into noise.
 */
export function playTick(): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastTick < 28) return;
  lastTick = now;
  vibrate(8);
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
