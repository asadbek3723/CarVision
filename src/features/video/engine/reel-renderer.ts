import {
  BEAT,
  REEL_DURATION,
  REEL_HEIGHT,
  REEL_WIDTH,
  T_BREAK_END,
  T_DRIVE_END,
  T_DROP,
  T_OPEN_END,
  T_OUTRO,
  buildShotList,
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  lerp,
  shotAt,
  type Shot,
  type ShotCamera,
} from './reel-timeline';

type Img = CanvasImageSource & { width: number; height: number };

export interface ReelAngle {
  id: string;
  label: string;
  /** The finished (tuned) photo of this side. The stock photo is never used in the reel. */
  image: Img;
}

export interface ReelPart {
  name: string;
  category: string;
  brand?: string | undefined;
}

export interface ReelConfig {
  angles: ReelAngle[];
  parts: ReelPart[];
  carName: string;
  /** Shop / brand name shown on the outro card (optional). */
  brandName?: string | undefined;
  /** Localised "made by" label for the outro credit. */
  madeByLabel?: string | undefined;
  /** Canvas font families (resolved from the page fonts); fall back to system fonts. */
  fonts?: { display?: string | undefined; bold?: string | undefined } | undefined;
}

const W = REEL_WIDTH;
const H = REEL_HEIGHT;
const GOLD = '#D4AE62';
const GOLD_A = (a: number) => `rgba(212,174,98,${clamp01(a).toFixed(3)})`;
const BG = '#050608';
const SYSTEM = "'Helvetica Neue','SF Pro Display',Arial,sans-serif";

/** Vertical centre of the "band" framing (whole car across the width). */
const BAND_Y = H * 0.5;
/** Band height for a photo: a touch taller than its natural height so the car fills the frame. */
const bandHeight = (iw: number, ih: number) => Math.min(H * 0.56, ((W * ih) / iw) * 1.18);
/** Share of the band that fades into the backdrop at the top and bottom. */
const BAND_FEATHER = 0.2;

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Cheap deterministic hash noise in 0..1 */
function noise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Bakes a cinematic grade into a copy of the photo once (Safari has no ctx.filter):
 * self soft-light for contrast and micro-detail, warm gold highlights, deep blacks.
 */
function gradePhoto(img: Img): HTMLCanvasElement {
  const maxW = 2048;
  const ratio = Math.min(1, maxW / Math.max(1, img.width));
  const c = makeCanvas(img.width * ratio, img.height * ratio);
  const g = c.getContext('2d');
  if (!g) return c;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  // contrast + clarity
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = 0.55;
  g.drawImage(img, 0, 0, c.width, c.height);
  // warm gold tone in the highlights, cool deep shadows
  g.globalAlpha = 1;
  const tone = g.createLinearGradient(0, 0, c.width, c.height);
  tone.addColorStop(0, 'rgba(255,196,120,0.22)');
  tone.addColorStop(1, 'rgba(70,110,140,0.16)');
  g.fillStyle = tone;
  g.fillRect(0, 0, c.width, c.height);
  // gentle lens falloff
  g.globalCompositeOperation = 'multiply';
  const v = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.72);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(1, 'rgba(120,120,120,1)');
  g.fillStyle = v;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** Tiny copy scaled up = soft blur, works everywhere. */
function blurred(img: Img): HTMLCanvasElement {
  const c = makeCanvas(54, 96);
  const g = c.getContext('2d');
  if (g) {
    g.imageSmoothingQuality = 'high';
    const s = Math.max(c.width / img.width, c.height / img.height);
    g.drawImage(img, (c.width - img.width * s) / 2, (c.height - img.height * s) / 2, img.width * s, img.height * s);
  }
  return c;
}

function spacedWidth(ctx: Ctx, text: string, spacing: number): number {
  const chars = [...text];
  return chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + spacing * Math.max(0, chars.length - 1);
}

/** Letter-spaced text (ctx.letterSpacing is not available everywhere). */
function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' | 'right' = 'left') {
  const chars = [...text];
  const total = spacedWidth(ctx, text, spacing);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
}

/** Per-letter reveal: each letter rises and sharpens in with a stagger. */
function revealText(ctx: Ctx, text: string, x: number, y: number, size: number, spacing: number, progress: number, align: 'left' | 'center' | 'right') {
  const chars = [...text];
  const total = spacedWidth(ctx, text, spacing);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const n = Math.max(1, chars.length);
  const base = ctx.globalAlpha;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    const e = easeOutCubic(clamp01(progress * 1.6 - (i / n) * 0.6));
    ctx.globalAlpha = base * e;
    ctx.fillText(c, cx, y + (1 - e) * size * 0.45);
    cx += ctx.measureText(c).width + spacing;
  });
  ctx.globalAlpha = base;
}

function fitText(ctx: Ctx, text: string, maxWidth: number, spacing = 0): string {
  if (spacedWidth(ctx, text, spacing) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && spacedWidth(ctx, `${t}…`, spacing) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function curve(shot: Shot, u: number): number {
  if (shot.ease === 'linear') return clamp01(u);
  if (shot.ease === 'ramp') return 0.75 * easeOutExpo(u) + 0.25 * clamp01(u); // speed ramp
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

function camAt(shot: Shot, u: number): ShotCamera {
  const e = curve(shot, u);
  return {
    cx: lerp(shot.from.cx, shot.to.cx, e),
    cy: lerp(shot.from.cy, shot.to.cy, e),
    zoom: lerp(shot.from.zoom, shot.to.zoom, e),
  };
}

export interface ReelRenderer {
  /** Draws the frame for time `t` (seconds) onto `ctx` (REEL_WIDTH x REEL_HEIGHT). */
  draw: (ctx: Ctx, t: number) => void;
}

export function createReelRenderer(cfg: ReelConfig): ReelRenderer {
  const n = Math.max(1, Math.min(5, cfg.angles.length));
  const photos = cfg.angles.slice(0, n).map((a) => gradePhoto(a.image));
  const soft = photos.map((p) => blurred(p));
  const shots = buildShotList(n);
  const parts = cfg.parts.slice(0, 3);
  const carName = (cfg.carName || 'CarVision').toUpperCase();
  const DISPLAY = cfg.fonts?.display ? `${cfg.fonts.display}, ${SYSTEM}` : SYSTEM;
  const BOLD = cfg.fonts?.bold ? `${cfg.fonts.bold}, ${SYSTEM}` : SYSTEM;
  const font = (ctx: Ctx, family: string, weight: number, size: number) => {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textBaseline = 'alphabetic';
  };

  // Film grain tile
  const grain = makeCanvas(256, 256);
  {
    const g = grain.getContext('2d')!;
    const data = g.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  }

  // Off-screen layer for the photo (lets transitions blend whole frames)
  const layer = makeCanvas(W, H);
  const lctx = layer.getContext('2d')!;
  // Band shots are drawn here first, then feathered onto the layer
  const bandLayer = makeCanvas(W, H);
  const bctx = bandLayer.getContext('2d')!;

  // Glints of light that drift through the frame
  const motes = Array.from({ length: 22 }, (_, i) => ({
    x: noise(i + 1),
    y: noise(i + 40),
    r: 1.5 + noise(i + 80) * 4,
    sp: 0.01 + noise(i + 120) * 0.03,
    a: 0.12 + noise(i + 160) * 0.25,
  }));

  // ---- photo framing ------------------------------------------------------------------------
  function drawPhoto(g: Ctx, idx: number, frame: Shot['frame'], cam: ShotCamera, offsetX = 0, extraZoom = 1, alpha = 1) {
    const img = photos[idx] ?? photos[0]!;
    const iw = img.width;
    const ih = img.height;
    g.save();
    g.globalAlpha = alpha;
    if (frame === 'full') {
      const s = Math.max(W / iw, H / ih) * cam.zoom * extraZoom;
      const dw = iw * s;
      const dh = ih * s;
      const x = Math.min(0, Math.max(W - dw, W / 2 - cam.cx * dw));
      const y = Math.min(0, Math.max(H - dh, H / 2 - cam.cy * dh));
      g.drawImage(img, x + offsetX, y, dw, dh);
    } else {
      const bandH = bandHeight(iw, ih);
      const top = BAND_Y - bandH / 2;
      const s = Math.max(W / iw, bandH / ih) * cam.zoom * extraZoom;
      const dw = iw * s;
      const dh = ih * s;
      const x = Math.min(0, Math.max(W - dw, W / 2 - cam.cx * dw));
      const y = Math.min(top, Math.max(top + bandH - dh, BAND_Y - cam.cy * dh));
      g.beginPath();
      g.rect(0, top, W, bandH);
      g.clip();
      g.drawImage(img, x + offsetX, y, dw, dh);
    }
    g.restore();
  }

  /** Backdrop for band shots: blurred photo, dark falloff, floor reflection of the band. */
  function drawBandBackdrop(g: Ctx, idx: number, t: number) {
    g.fillStyle = BG;
    g.fillRect(0, 0, W, H);
    g.save();
    g.globalAlpha = 0.3;
    g.imageSmoothingEnabled = true;
    g.drawImage(soft[idx] ?? soft[0]!, -60, -60, W + 120, H + 120);
    g.restore();
    const vg = g.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(5,6,8,0.96)');
    vg.addColorStop(0.3, 'rgba(5,6,8,0.55)');
    vg.addColorStop(0.7, 'rgba(5,6,8,0.55)');
    vg.addColorStop(1, 'rgba(5,6,8,0.98)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    const glow = g.createRadialGradient(W / 2, BAND_Y, 40, W / 2, BAND_Y, 820);
    glow.addColorStop(0, GOLD_A(0.1 + pulse * 0.05));
    glow.addColorStop(1, GOLD_A(0));
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
  }

  /** Feathers the band into the backdrop (alpha mask, no hard edges) and adds a floor reflection. */
  function compositeBand(g: Ctx, idx: number) {
    const img = photos[idx] ?? photos[0]!;
    const bandH = bandHeight(img.width, img.height);
    const top = BAND_Y - bandH / 2;
    const bottom = top + bandH;
    bctx.save();
    bctx.globalCompositeOperation = 'destination-in';
    const m = bctx.createLinearGradient(0, top, 0, bottom);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(BAND_FEATHER, 'rgba(0,0,0,1)');
    m.addColorStop(1 - BAND_FEATHER * 0.6, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = m;
    bctx.fillRect(0, 0, W, H);
    bctx.restore();
    g.drawImage(bandLayer, 0, 0);
    // reflection on a glossy floor, fading out
    const reflH = bandH * 0.42;
    g.save();
    g.globalAlpha = 0.2;
    g.translate(0, bottom * 2 - bandH * BAND_FEATHER * 0.6);
    g.scale(1, -1);
    g.drawImage(bandLayer, 0, bottom - reflH, W, reflH, 0, bottom - reflH, W, reflH);
    g.restore();
    const fade = g.createLinearGradient(0, bottom - bandH * 0.1, 0, bottom + reflH);
    fade.addColorStop(0, 'rgba(5,6,8,0)');
    fade.addColorStop(1, 'rgba(5,6,8,0.92)');
    g.fillStyle = fade;
    g.fillRect(0, bottom - bandH * 0.1, W, reflH + bandH * 0.1);
  }

  /** Paints one shot (with its entry transition) onto the off-screen layer. */
  function paintShot(shot: Shot, index: number, t: number) {
    const since = t - shot.start;
    const u = since / shot.dur;
    const cam = camAt(shot, u);
    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.globalAlpha = 1;

    if (shot.frame === 'band') drawBandBackdrop(lctx, shot.angle, t);
    else {
      lctx.fillStyle = BG;
      lctx.fillRect(0, 0, W, H);
    }

    const band = shot.frame === 'band';
    const pg = band ? bctx : lctx;
    if (band) bctx.clearRect(0, 0, W, H);
    const tw = shot.transition;
    if (tw === 'whip' && since < 0.16) {
      // motion-blurred whip pan settling into the shot
      const p = 1 - since / 0.16;
      const off = shot.dir * p * p * W * 0.42;
      for (let j = 5; j >= 0; j--) {
        drawPhoto(pg, shot.angle, shot.frame, cam, off * (1 + j * 0.12), 1, j === 0 ? 1 : 0.22);
      }
    } else if (tw === 'zoom' && since < 0.2) {
      const p = 1 - since / 0.2;
      drawPhoto(pg, shot.angle, shot.frame, cam, 0, 1 + 0.28 * p * p);
      for (let j = 1; j <= 3; j++) drawPhoto(pg, shot.angle, shot.frame, cam, 0, 1 + 0.28 * p * p + j * 0.05 * p, 0.18 * p);
    } else {
      drawPhoto(pg, shot.angle, shot.frame, cam);
    }

    if (tw === 'glitch' && since < 0.11) {
      const p = 1 - since / 0.11;
      pg.save();
      pg.globalCompositeOperation = 'screen';
      pg.globalAlpha = 0.45 * p;
      drawPhoto(pg, shot.angle, shot.frame, cam, 22 * p * shot.dir, 1.01);
      pg.restore();
      // displaced slices
      for (let s = 0; s < 5; s++) {
        const y = noise(index * 13 + s) * H;
        const h = 20 + noise(index * 7 + s) * 90;
        const dx = (noise(index * 3 + s) - 0.5) * 140 * p;
        pg.drawImage(band ? bandLayer : layer, 0, y, W, h, dx, y, W, h);
      }
    }

    // light sweep over the paint on longer shots
    if (shot.dur >= BEAT && shot.section !== 'open') {
      const x = lerp(-W * 0.6, W * 1.6, easeInOutCubic(u));
      pg.save();
      pg.globalCompositeOperation = 'lighter';
      pg.translate(W / 2, H / 2);
      pg.rotate(-0.32);
      pg.translate(-W / 2, -H / 2);
      const g = pg.createLinearGradient(x - 200, 0, x + 200, 0);
      g.addColorStop(0, 'rgba(255,236,200,0)');
      g.addColorStop(0.5, 'rgba(255,236,200,0.09)');
      g.addColorStop(1, 'rgba(255,236,200,0)');
      pg.fillStyle = g;
      pg.fillRect(x - 200, -600, 400, H + 1200);
      pg.restore();
    }

    if (band) compositeBand(lctx, shot.angle);
    lctx.restore();
  }

  function lightLeak(g: Ctx, t: number, strength: number) {
    if (strength <= 0.003) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const x1 = W * (0.15 + 0.25 * Math.sin(t * 0.7));
    const y1 = H * (0.2 + 0.1 * Math.cos(t * 0.5));
    const a = g.createRadialGradient(x1, y1, 0, x1, y1, W * 0.9);
    a.addColorStop(0, `rgba(255,170,80,${(0.22 * strength).toFixed(3)})`);
    a.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = a;
    g.fillRect(0, 0, W, H);
    const x2 = W * (0.85 - 0.2 * Math.sin(t * 0.9 + 1));
    const y2 = H * (0.8 + 0.08 * Math.sin(t * 0.6));
    const b = g.createRadialGradient(x2, y2, 0, x2, y2, W * 0.8);
    b.addColorStop(0, `rgba(255,120,60,${(0.14 * strength).toFixed(3)})`);
    b.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = b;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  function anamorphicFlare(g: Ctx, y: number, strength: number) {
    if (strength <= 0.003) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const streak = g.createLinearGradient(0, 0, W, 0);
    streak.addColorStop(0, 'rgba(255,214,150,0)');
    streak.addColorStop(0.5, `rgba(255,236,200,${(0.75 * strength).toFixed(3)})`);
    streak.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = streak;
    g.fillRect(0, y - 3, W, 6);
    g.globalAlpha = 0.35 * strength;
    g.fillRect(0, y - 18, W, 36);
    const core = g.createRadialGradient(W / 2, y, 0, W / 2, y, 260);
    core.addColorStop(0, `rgba(255,240,215,${(0.55 * strength).toFixed(3)})`);
    core.addColorStop(1, 'rgba(255,240,215,0)');
    g.globalAlpha = 1;
    g.fillStyle = core;
    g.fillRect(0, y - 260, W, 520);
    g.restore();
  }

  function motesLayer(g: Ctx, t: number, alpha: number) {
    if (alpha <= 0.01) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = '#FFE2A8';
    for (const m of motes) {
      const y = (((m.y - t * m.sp) % 1) + 1) % 1;
      const x = (m.x + Math.sin(t * 0.5 + m.r) * 0.015 + 1) % 1;
      g.globalAlpha = m.a * alpha * (0.6 + 0.4 * Math.sin(t * 3 + m.r * 5));
      g.beginPath();
      g.arc(x * W, y * H, m.r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function letterbox(g: Ctx, amount: number) {
    if (amount <= 0.001) return;
    const bar = 300 * easeInOutCubic(amount);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, bar);
    g.fillRect(0, H - bar, W, bar);
  }

  function grainPass(g: Ctx, t: number, alpha: number) {
    const f = Math.floor(t * 30);
    const ox = (f * 53) % 256;
    const oy = (f * 97) % 256;
    g.save();
    g.globalAlpha = alpha;
    g.globalCompositeOperation = 'overlay';
    for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) g.drawImage(grain, x, y);
    g.restore();
  }

  // ---- typography -----------------------------------------------------------------------------
  function titleOpen(g: Ctx, t: number) {
    if (t < 1.0 || t >= T_OPEN_END + 0.3) return;
    const p = clamp01((t - 1.05) / 0.8);
    const out = 1 - clamp01((t - T_OPEN_END + 0.1) / 0.3);
    g.save();
    g.globalAlpha = out;
    g.fillStyle = 'rgba(255,255,255,0.92)';
    font(g, DISPLAY, 300, 30);
    revealText(g, fitText(g, carName, W - 200, 14), W / 2, 1470, 30, 14, p, 'center');
    g.fillStyle = GOLD;
    font(g, DISPLAY, 500, 20);
    g.globalAlpha = out * easeOutCubic((t - 1.4) / 0.5);
    spaced(g, 'AI  TUNING  STUDIO', W / 2, 1524, 12, 'center');
    g.restore();
  }

  function titleDrop(g: Ctx, t: number) {
    const local = t - T_DROP;
    if (local < 0 || local > 1.7) return;
    const inP = clamp01(local / 0.32);
    const out = 1 - clamp01((local - 1.35) / 0.35);
    const s = lerp(1.55, 1, easeOutBack(inP));
    g.save();
    g.globalAlpha = out;
    g.translate(W / 2, 470);
    g.scale(s, s);
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 40;
    g.fillStyle = '#FFFFFF';
    font(g, DISPLAY, 200, 112);
    spaced(g, 'BUILT', 0, 0, 34, 'center');
    const grad = g.createLinearGradient(-320, 0, 320, 0);
    grad.addColorStop(0, '#F3E2B4');
    grad.addColorStop(0.55, '#D4AE62');
    grad.addColorStop(1, '#A67C3D');
    g.fillStyle = grad;
    font(g, DISPLAY, 300, 112);
    spaced(g, 'DIFFERENT', 0, 132, 26, 'center');
    g.restore();
  }

  /** Part callouts during the montage: hairline + name, slides in from the side. */
  function callouts(g: Ctx, t: number) {
    const items = parts.length > 0 ? parts : [{ name: 'AI TUNING', category: carName }];
    const slots = [5.5, 7.0, 8.5];
    slots.forEach((start, i) => {
      const part = items[i % items.length]!;
      if (i >= items.length) return;
      const local = t - start;
      const len = 1.3;
      if (local < 0 || local > len) return;
      const inP = easeOutExpo(local / 0.35);
      const out = 1 - clamp01((local - len + 0.25) / 0.25);
      const x0 = 84;
      const y0 = 1560;
      g.save();
      g.globalAlpha = out;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, y0 - 110, W * inP, 190);
      g.fillStyle = GOLD;
      g.fillRect(x0, y0 - 74, 140 * inP, 3);
      font(g, DISPLAY, 500, 20);
      g.globalAlpha = out * inP;
      spaced(g, `0${i + 1}`, x0, y0 - 88, 6);
      g.fillStyle = '#FFFFFF';
      font(g, BOLD, 700, 54);
      const name = fitText(g, part.name.toUpperCase(), W - x0 * 2, 3);
      g.save();
      g.beginPath();
      g.rect(x0, y0 - 60, W, 80);
      g.clip();
      spaced(g, name, x0 + (1 - inP) * -60, y0 + (1 - inP) * 50, 3);
      g.restore();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      font(g, DISPLAY, 400, 24);
      const sub = [part.brand, part.category].filter(Boolean).join('  ·  ').toUpperCase();
      spaced(g, fitText(g, sub, W - x0 * 2, 6), x0, y0 + 48, 6);
      g.restore();
    });
  }

  function titleBreak(g: Ctx, t: number) {
    const local = t - T_DRIVE_END;
    if (local < 0.2 || local > 2.0) return;
    const a = easeOutCubic((local - 0.2) / 0.5) * (1 - clamp01((local - 1.75) / 0.25));
    g.save();
    g.globalAlpha = a;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    font(g, DISPLAY, 300, 26);
    spaced(g, 'TUNE   •   STYLE   •   PERFORM', W / 2, H - 140, 10, 'center');
    g.restore();
  }

  function outroCard(g: Ctx, t: number) {
    const p = t - T_OUTRO;
    if (p < 0) return;
    g.save();
    g.globalAlpha = easeInOutCubic(p / 0.9) * 0.72;
    g.fillStyle = BG;
    g.fillRect(-40, -40, W + 80, H + 80);
    g.restore();

    const cy = 860;
    // diamond mark
    const markP = easeOutBack((p - 0.05) / 0.7);
    g.save();
    g.translate(W / 2, cy - 230);
    g.rotate(Math.PI / 4);
    g.scale(markP, markP);
    g.globalAlpha = clamp01(p / 0.4);
    g.strokeStyle = GOLD;
    g.lineWidth = 3;
    g.strokeRect(-56, -56, 112, 112);
    g.fillStyle = GOLD_A(0.25);
    g.fillRect(-26, -26, 52, 52);
    g.restore();

    g.save();
    g.fillStyle = '#FFFFFF';
    font(g, DISPLAY, 200, 104);
    revealText(g, 'CARVISION', W / 2, cy, 104, 30, clamp01((p - 0.15) / 0.9), 'center');
    g.restore();

    const lineP = easeOutExpo((p - 0.3) / 0.9);
    g.save();
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(W / 2 - 300 * lineP, cy + 64);
    g.lineTo(W / 2 + 300 * lineP, cy + 64);
    g.stroke();
    g.restore();

    g.save();
    g.globalAlpha = easeOutCubic((p - 0.6) / 0.6);
    g.fillStyle = GOLD;
    font(g, DISPLAY, 400, 30);
    spaced(g, fitText(g, carName, W - 180, 12), W / 2, cy + 134, 12, 'center');
    g.restore();

    if (parts.length > 0) {
      g.save();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      font(g, DISPLAY, 300, 30);
      parts.forEach((part, i) => {
        const a = easeOutCubic((p - 0.95 - i * 0.14) / 0.45);
        if (a <= 0) return;
        g.globalAlpha = a;
        spaced(g, fitText(g, part.name.toUpperCase(), W - 220, 4), W / 2, cy + 250 + i * 58 + (1 - a) * 18, 4, 'center');
      });
      g.restore();
    }

    if (cfg.brandName) {
      g.save();
      g.globalAlpha = easeOutCubic((p - 1.4) / 0.5);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      font(g, DISPLAY, 400, 22);
      const label = `${(cfg.madeByLabel || '').toUpperCase()}  ${cfg.brandName.toUpperCase()}`.trim();
      spaced(g, fitText(g, label, W - 180, 6), W / 2, 1640, 6, 'center');
      g.restore();
    }
  }

  // ---- main draw ------------------------------------------------------------------------------
  function draw(ctx: Ctx, tRaw: number) {
    const t = Math.min(REEL_DURATION - 1e-3, Math.max(0, tRaw));
    const { shot, index } = shotAt(shots, t);
    const since = t - shot.start;

    paintShot(shot, index, t);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Camera shake and beat punch
    const sinceDrop = t - T_DROP;
    const sinceOutro = t - T_OUTRO;
    let shake = 0;
    if (sinceDrop >= 0 && sinceDrop < 0.7) shake = 26 * Math.pow(1 - sinceDrop / 0.7, 2);
    if (sinceOutro >= 0 && sinceOutro < 0.6) shake = Math.max(shake, 18 * Math.pow(1 - sinceOutro / 0.6, 2));
    if (shot.section === 'stutter') shake = Math.max(shake, 6);
    if (shot.section === 'build' && t > T_OPEN_END + 3 * BEAT) shake = Math.max(shake, 5);
    const sx = shake * Math.sin(t * 93.1);
    const sy = shake * Math.cos(t * 71.7);
    let punch = 0;
    if (t >= T_DROP && t < T_DRIVE_END) punch = Math.exp(-(((t - T_DROP) % BEAT) * 10));
    const scale = 1 + 0.02 * punch + (sinceDrop >= 0 && sinceDrop < 0.35 ? 0.05 * (1 - sinceDrop / 0.35) : 0);

    // Opening: shots rise out of darkness through light flickers
    let exposure = 1;
    if (shot.section === 'open') {
      if (t < T_DROP && shot.dur <= BEAT + 1e-6) {
        // flicker on, then decay (like a light catching the paint)
        const f = since < 0.06 ? 1 : since < 0.12 ? 0.25 : since < 0.2 ? 0.85 : Math.max(0, 0.85 - (since - 0.2) * 2.4);
        exposure = f;
      } else {
        exposure = easeInOutCubic(since / 0.7);
      }
    } else if (shot.transition === 'fade') {
      exposure = 0.25 + 0.75 * easeInOutCubic(since / 0.35);
    }

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = exposure;
    ctx.drawImage(layer, -W / 2, -H / 2);
    ctx.restore();

    // Atmosphere
    const leak =
      shot.section === 'open' ? 0.6 * exposure
      : shot.section === 'break' ? 0.9
      : shot.section === 'outro' ? 0.7
      : shot.section === 'drop' ? 0.8 * (1 - clamp01(since / 0.8))
      : 0.18;
    lightLeak(ctx, t, leak);
    motesLayer(ctx, t, shot.section === 'drive' || shot.section === 'stutter' ? 0.35 : 0.85);
    if (sinceDrop >= 0 && sinceDrop < 0.9) anamorphicFlare(ctx, BAND_Y, 1 - sinceDrop / 0.9);
    if (sinceOutro >= 0 && sinceOutro < 0.8) anamorphicFlare(ctx, BAND_Y, 0.8 * (1 - sinceOutro / 0.8));

    // Shockwave ring on the drop
    if (sinceDrop >= 0 && sinceDrop < 1.1) {
      const rp = easeOutExpo(sinceDrop / 1.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = GOLD_A(0.55 * (1 - sinceDrop / 1.1));
      ctx.lineWidth = 4 + 26 * (1 - rp);
      ctx.beginPath();
      ctx.arc(W / 2, BAND_Y, 60 + rp * 1000, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Letterbox for the slow-motion break
    const lb = t >= T_DRIVE_END && t < T_BREAK_END ? Math.min(clamp01((t - T_DRIVE_END) / 0.4), 1 - clamp01((t - T_BREAK_END + 0.15) / 0.15)) : 0;
    letterbox(ctx, lb);

    // Text
    ctx.save();
    ctx.translate(sx * 0.5, sy * 0.5);
    titleOpen(ctx, t);
    titleDrop(ctx, t);
    if (shot.section === 'drive') callouts(ctx, t);
    titleBreak(ctx, t);
    outroCard(ctx, t);
    ctx.restore();

    // Flash frames
    let flash = 0;
    if (shot.transition === 'flash') flash = (shot.section === 'stutter' ? 0.5 : 0.9) * Math.pow(1 - clamp01(since / 0.2), 2);
    if (shot.transition === 'cut' && since < 1 / 30 && shot.section !== 'open') flash = 0.12;
    if (shot.transition === 'whip' && since < 0.05) flash = Math.max(flash, 0.18);
    if (flash > 0.003) {
      ctx.fillStyle = `rgba(255,246,228,${flash.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Lens vignette, grain, fades
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    grainPass(ctx, t, 0.06);

    const fadeOut = clamp01((t - (REEL_DURATION - 0.8)) / 0.8);
    if (fadeOut > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${fadeOut.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  return { draw };
}
