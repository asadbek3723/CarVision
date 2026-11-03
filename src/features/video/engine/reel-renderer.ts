import {
  BEAT,
  REEL_DURATION,
  REEL_HEIGHT,
  REEL_WIDTH,
  T_BA_END,
  T_INTRO_END,
  T_SCAN_END,
  T_SHOW_END,
  angleDuration,
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  lerp,
} from './reel-timeline';

export interface ReelAngle {
  id: string;
  label: string;
  before: CanvasImageSource & { width: number; height: number };
  after: CanvasImageSource & { width: number; height: number };
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
}

const W = REEL_WIDTH;
const H = REEL_HEIGHT;
const GOLD = '#D4AE62';
const GOLD_SOFT = 'rgba(212,174,98,';
const BG = '#07080B';
const FONT = "'Inter','SF Pro Display','Helvetica Neue',Arial,sans-serif";

/** The photo window: a wide band in the middle, feathered into the background. */
const FRAME = { y: 470, h: 940 };

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawCover(
  ctx: Ctx,
  img: CanvasImageSource & { width: number; height: number },
  rw: number,
  rh: number,
  zoom: number,
  panX = 0,
  panY = 0
) {
  const iw = img.width || 1;
  const ih = img.height || 1;
  const scale = Math.max(rw / iw, rh / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (rw - dw) / 2 + panX, (rh - dh) / 2 + panY, dw, dh);
}

/** Letter-spaced text (ctx.letterSpacing is not available everywhere). */
function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' | 'right' = 'left') {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += (widths[i] ?? 0) + spacing;
  });
}

/** Per-character reveal: each letter rises out of a mask with a stagger. */
function revealText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  spacing: number,
  progress: number,
  align: 'left' | 'center' | 'right',
  color: string
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const n = Math.max(1, chars.length);
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    const local = clamp01(progress * (1 + 0.65) - (i / n) * 0.65);
    const e = easeOutCubic(local);
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * e;
    ctx.fillText(c, cx, y + (1 - e) * size * 0.55);
    ctx.globalAlpha = prevAlpha;
    cx += (widths[i] ?? 0) + spacing;
  });
  ctx.restore();
}

function setFont(ctx: Ctx, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
}

function truncate(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export interface ReelRenderer {
  /** Draws the frame for time `t` (seconds) onto `ctx` (REEL_WIDTH x REEL_HEIGHT). */
  draw: (ctx: Ctx, t: number) => void;
}

export function createReelRenderer(cfg: ReelConfig): ReelRenderer {
  const angles = cfg.angles;
  const n = angles.length;
  const segDur = angleDuration(n);
  const hero = angles[0]!;

  // Pre-blurred backdrops: tiny canvases scaled up (no ctx.filter, works on Safari)
  const smallOf = (img: ReelAngle['before']) => {
    const c = makeCanvas(48, 86);
    const cctx = c.getContext('2d');
    if (cctx) {
      cctx.imageSmoothingQuality = 'high';
      drawCover(cctx, img, 48, 86, 1);
    }
    return c;
  };
  const smallBefore = angles.map((a) => smallOf(a.before));
  const smallAfter = angles.map((a) => smallOf(a.after));

  const frameCanvas = makeCanvas(W, FRAME.h);
  const frameCtx = frameCanvas.getContext('2d')!;

  // Film grain tile
  const grain = makeCanvas(256, 256);
  {
    const gctx = grain.getContext('2d')!;
    const data = gctx.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.random() * 255;
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    gctx.putImageData(data, 0, 0);
  }

  // Deterministic dust / bokeh
  const dust = Array.from({ length: 28 }, (_, i) => ({
    x: ((i * 137.5) % 100) / 100,
    y: ((i * 61.8) % 100) / 100,
    r: 2 + (i % 5) * 1.6,
    sp: 0.012 + (i % 6) * 0.006,
    a: 0.1 + (i % 4) * 0.06,
  }));

  const parts = cfg.parts.slice(0, 6);
  const carName = (cfg.carName || 'CarVision Tuning').toUpperCase();

  // ---- helpers bound to this reel -------------------------------------------------------
  function drawBackdrop(ctx: Ctx, t: number, beforeToAfter: number, idx: number) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    const b = smallBefore[idx] ?? smallBefore[0]!;
    const a = smallAfter[idx] ?? smallAfter[0]!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.34 * (1 - beforeToAfter);
    ctx.drawImage(b, 0, 0, W, H);
    ctx.globalAlpha = 0.4 * beforeToAfter;
    ctx.drawImage(a, 0, 0, W, H);
    ctx.globalAlpha = 1;

    // Vignette + gold glow behind the car
    const vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(7,8,11,0.92)');
    vg.addColorStop(0.3, 'rgba(7,8,11,0.35)');
    vg.addColorStop(0.7, 'rgba(7,8,11,0.4)');
    vg.addColorStop(1, 'rgba(7,8,11,0.95)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
    const glow = ctx.createRadialGradient(W / 2, FRAME.y + FRAME.h / 2, 40, W / 2, FRAME.y + FRAME.h / 2, 760);
    glow.addColorStop(0, `${GOLD_SOFT}${(0.09 + pulse * 0.04).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(212,174,98,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Dust
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of dust) {
      const y = (((p.y - t * p.sp) % 1) + 1) % 1;
      const x = (p.x + Math.sin(t * 0.4 + p.r) * 0.012 + 1) % 1;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(x * W, y * H, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function featherFrame() {
    frameCtx.save();
    frameCtx.globalCompositeOperation = 'destination-in';
    const g = frameCtx.createLinearGradient(0, 0, 0, FRAME.h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.16, 'rgba(0,0,0,1)');
    g.addColorStop(0.84, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    frameCtx.fillStyle = g;
    frameCtx.fillRect(0, 0, W, FRAME.h);
    frameCtx.restore();
  }

  function brackets(ctx: Ctx, progress: number, alpha: number) {
    const p = easeOutCubic(progress);
    const inset = lerp(90, 36, p);
    const len = 70;
    const top = FRAME.y + 30 + (1 - p) * 30;
    const bottom = FRAME.y + FRAME.h - 30 - (1 - p) * 30;
    ctx.save();
    ctx.strokeStyle = `${GOLD_SOFT}${(0.9 * alpha).toFixed(3)})`;
    ctx.lineWidth = 3;
    const corner = (x: number, y: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * len, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * len);
      ctx.stroke();
    };
    corner(inset, top, 1, 1);
    corner(W - inset, top, -1, 1);
    corner(inset, bottom, 1, -1);
    corner(W - inset, bottom, -1, -1);
    ctx.restore();
  }

  function header(ctx: Ctx, alpha: number, subtitle: string) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = GOLD;
    setFont(ctx, 800, 30);
    spaced(ctx, 'CARVISION', W / 2, 128, 14, 'center');
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    setFont(ctx, 600, 24);
    spaced(ctx, subtitle, W / 2, 174, 6, 'center');
    ctx.strokeStyle = `${GOLD_SOFT}0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, 200);
    ctx.lineTo(W / 2 + 60, 200);
    ctx.stroke();
    ctx.restore();
  }

  function lightSweep(ctx: Ctx, progress: number, alpha: number) {
    const x = lerp(-W * 0.5, W * 1.5, progress);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
    g.addColorStop(0, 'rgba(255,240,205,0)');
    g.addColorStop(0.5, `rgba(255,240,205,${alpha.toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,240,205,0)');
    ctx.translate(W / 2, FRAME.h / 2);
    ctx.rotate(-0.28);
    ctx.translate(-W / 2, -FRAME.h / 2);
    ctx.fillStyle = g;
    ctx.fillRect(x - 220, -400, 440, FRAME.h + 800);
    ctx.restore();
  }

  function lowerThird(ctx: Ctx, idx: number, u: number) {
    const angle = angles[idx]!;
    const inP = easeOutCubic(u / 0.2);
    const outP = 1 - clamp01((u - 0.9) / 0.1);
    const a = clamp01(inP) * outP;
    if (a <= 0.001) return;
    const y0 = 1500;

    ctx.save();
    ctx.globalAlpha = a;

    // Big index numerals
    ctx.fillStyle = GOLD;
    setFont(ctx, 900, 150);
    ctx.fillText(String(idx + 1).padStart(2, '0'), 70 - (1 - inP) * 60, y0 + 40);

    // Angle label
    setFont(ctx, 800, 40);
    ctx.fillStyle = '#FFFFFF';
    spaced(ctx, angle.label.toUpperCase(), 290, y0 - 20, 8);
    ctx.fillStyle = `${GOLD_SOFT}0.9)`;
    setFont(ctx, 600, 24);
    spaced(ctx, `RAKURS ${idx + 1} / ${n}`, 292, y0 + 18, 6);

    // Part strip (cycles through the chosen parts)
    if (parts.length > 0) {
      const part = parts[idx % parts.length]!;
      const stripW = W - 140;
      ctx.save();
      ctx.beginPath();
      ctx.rect(70, y0 + 70, stripW * easeOutCubic((u - 0.06) / 0.22), 120);
      ctx.clip();
      const g = ctx.createLinearGradient(70, 0, 70 + stripW, 0);
      g.addColorStop(0, 'rgba(212,174,98,0.22)');
      g.addColorStop(1, 'rgba(212,174,98,0.03)');
      ctx.fillStyle = g;
      ctx.fillRect(70, y0 + 70, stripW, 120);
      ctx.fillStyle = GOLD;
      ctx.fillRect(70, y0 + 70, 6, 120);
      ctx.fillStyle = '#FFFFFF';
      setFont(ctx, 800, 40);
      ctx.fillText(truncate(ctx, part.name, stripW - 60), 100, y0 + 124);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      setFont(ctx, 600, 26);
      const sub = [part.brand, part.category].filter(Boolean).join('  ·  ').toUpperCase();
      spaced(ctx, truncate(ctx, sub, stripW - 60), 100, y0 + 166, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  function progressDashes(ctx: Ctx, t: number) {
    const total = W - 140;
    const gap = 12;
    const w = (total - gap * (n - 1)) / n;
    const y = 1768;
    for (let i = 0; i < n; i++) {
      const start = T_SCAN_END + i * segDur;
      const f = clamp01((t - start) / segDur);
      const x = 70 + i * (w + gap);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = GOLD;
      ctx.fillRect(x, y, w * f, 5);
    }
  }

  function drawGrain(ctx: Ctx, t: number, alpha: number) {
    const ox = (Math.floor(t * 30) * 53) % 256;
    const oy = (Math.floor(t * 30) * 97) % 256;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    for (let x = -ox; x < W; x += 256) {
      for (let y = -oy; y < H; y += 256) ctx.drawImage(grain, x, y);
    }
    ctx.restore();
  }

  // ---- scene painters -----------------------------------------------------------------------
  function paintFrameIntro(t: number) {
    const u = clamp01(t / T_INTRO_END);
    frameCtx.clearRect(0, 0, W, FRAME.h);
    drawCover(frameCtx, hero.before, W, FRAME.h, lerp(1.0, 1.1, easeOutCubic(u)), lerp(30, -20, u), 0);
    frameCtx.fillStyle = 'rgba(10,14,22,0.28)';
    frameCtx.fillRect(0, 0, W, FRAME.h);
    featherFrame();
  }

  function paintFrameScan(t: number) {
    const p = clamp01((t - T_INTRO_END) / (T_SCAN_END - T_INTRO_END));
    const sweep = easeInOutCubic(p);
    const zoom = lerp(1.1, 1.06, p);
    frameCtx.clearRect(0, 0, W, FRAME.h);
    drawCover(frameCtx, hero.before, W, FRAME.h, zoom, lerp(-20, 0, p), 0);
    frameCtx.fillStyle = 'rgba(10,14,22,0.28)';
    frameCtx.fillRect(0, 0, W, FRAME.h);

    const scanY = sweep * FRAME.h;
    frameCtx.save();
    frameCtx.beginPath();
    frameCtx.rect(0, 0, W, scanY);
    frameCtx.clip();
    drawCover(frameCtx, hero.after, W, FRAME.h, zoom, lerp(-20, 0, p), 0);
    // HUD grid in the revealed area
    frameCtx.strokeStyle = 'rgba(212,174,98,0.12)';
    frameCtx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      frameCtx.beginPath();
      frameCtx.moveTo(x, 0);
      frameCtx.lineTo(x, FRAME.h);
      frameCtx.stroke();
    }
    for (let y = 0; y < FRAME.h; y += 60) {
      frameCtx.beginPath();
      frameCtx.moveTo(0, y);
      frameCtx.lineTo(W, y);
      frameCtx.stroke();
    }
    frameCtx.restore();

    // Laser line + glow
    frameCtx.save();
    frameCtx.globalCompositeOperation = 'lighter';
    const glow = frameCtx.createLinearGradient(0, scanY - 150, 0, scanY + 40);
    glow.addColorStop(0, 'rgba(212,174,98,0)');
    glow.addColorStop(0.85, 'rgba(212,174,98,0.34)');
    glow.addColorStop(1, 'rgba(212,174,98,0)');
    frameCtx.fillStyle = glow;
    frameCtx.fillRect(0, scanY - 150, W, 190);
    frameCtx.fillStyle = 'rgba(255,236,190,0.95)';
    frameCtx.fillRect(0, scanY - 2, W, 4);
    frameCtx.restore();
    featherFrame();
  }

  function paintFrameShowcase(t: number) {
    const local = t - T_SCAN_END;
    const idx = Math.min(n - 1, Math.floor(local / segDur));
    const u = (local - idx * segDur) / segDur;
    const dir = idx % 2 === 0 ? 1 : -1;
    frameCtx.clearRect(0, 0, W, FRAME.h);

    const cutIn = clamp01((local - idx * segDur) / 0.3);
    const eased = easeOutExpo(cutIn);

    if (idx > 0 && cutIn < 1) {
      // Outgoing angle zooms away while the new one whips in
      const prev = angles[idx - 1]!;
      frameCtx.save();
      frameCtx.globalAlpha = 1 - eased;
      drawCover(frameCtx, prev.after, W, FRAME.h, 1.16 + 0.1 * eased, -dir * 60 * eased, 0);
      frameCtx.restore();
    }

    const zoom = lerp(1.04, 1.14, easeOutCubic(u)) + (1 - eased) * 0.22;
    const pan = dir * lerp(-34, 34, u) + dir * (1 - eased) * 160;
    frameCtx.save();
    frameCtx.globalAlpha = idx === 0 ? 1 : Math.max(eased, 0.4);
    drawCover(frameCtx, angles[idx]!.after, W, FRAME.h, zoom, pan, 0);
    frameCtx.restore();

    // RGB-split ghost on the cut
    if (cutIn < 0.55) {
      frameCtx.save();
      frameCtx.globalCompositeOperation = 'screen';
      frameCtx.globalAlpha = (1 - cutIn / 0.55) * 0.22;
      frameCtx.translate(14 * (1 - cutIn / 0.55), 0);
      drawCover(frameCtx, angles[idx]!.after, W, FRAME.h, zoom, pan, 0);
      frameCtx.restore();
    }

    lightSweep(frameCtx, easeInOutCubic(clamp01((u - 0.05) / 0.9)), 0.12);
    featherFrame();
    return { idx, u };
  }

  function paintFrameBeforeAfter(t: number) {
    const p = clamp01((t - T_SHOW_END) / (T_BA_END - T_SHOW_END));
    let pos: number;
    if (p < 0.25) pos = lerp(0.5, 0.1, easeInOutCubic(p / 0.25));
    else if (p < 0.75) pos = lerp(0.1, 0.9, easeInOutCubic((p - 0.25) / 0.5));
    else pos = lerp(0.9, 0.5, easeInOutCubic((p - 0.75) / 0.25));
    const x = pos * W;
    const zoom = 1.06;

    frameCtx.clearRect(0, 0, W, FRAME.h);
    drawCover(frameCtx, hero.after, W, FRAME.h, zoom);
    frameCtx.save();
    frameCtx.beginPath();
    frameCtx.rect(0, 0, x, FRAME.h);
    frameCtx.clip();
    drawCover(frameCtx, hero.before, W, FRAME.h, zoom);
    frameCtx.fillStyle = 'rgba(10,14,22,0.22)';
    frameCtx.fillRect(0, 0, W, FRAME.h);
    frameCtx.restore();

    // Divider + glow
    frameCtx.save();
    frameCtx.globalCompositeOperation = 'lighter';
    const g = frameCtx.createLinearGradient(x - 90, 0, x + 90, 0);
    g.addColorStop(0, 'rgba(212,174,98,0)');
    g.addColorStop(0.5, 'rgba(212,174,98,0.4)');
    g.addColorStop(1, 'rgba(212,174,98,0)');
    frameCtx.fillStyle = g;
    frameCtx.fillRect(x - 90, 0, 180, FRAME.h);
    frameCtx.restore();
    frameCtx.fillStyle = 'rgba(255,236,190,0.98)';
    frameCtx.fillRect(x - 2, 0, 4, FRAME.h);

    featherFrame();
    return { x };
  }

  // ---- main draw ----------------------------------------------------------------------------
  function draw(ctx: Ctx, tRaw: number) {
    const t = Math.min(REEL_DURATION, Math.max(0, tRaw));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Shake: ramps during the scan, explodes at the impact, decays
    const sinceImpact = t - T_SCAN_END;
    const sinceFinal = t - T_BA_END;
    let shake = 0;
    if (t >= T_INTRO_END && t < T_SCAN_END) shake = 2 + 7 * clamp01((t - T_INTRO_END) / 1.5);
    if (sinceImpact >= 0 && sinceImpact < 0.7) shake = 22 * Math.pow(1 - sinceImpact / 0.7, 2);
    if (sinceFinal >= 0 && sinceFinal < 0.6) shake = 18 * Math.pow(1 - sinceFinal / 0.6, 2);
    const sx = shake * Math.sin(t * 91.7);
    const sy = shake * Math.cos(t * 77.3);

    // Section
    let heroIdx = 0;
    let beforeToAfter = 0;
    if (t >= T_SCAN_END) beforeToAfter = 1;
    else if (t >= T_INTRO_END) beforeToAfter = easeInOutCubic((t - T_INTRO_END) / (T_SCAN_END - T_INTRO_END));
    if (t >= T_SCAN_END && t < T_SHOW_END) {
      heroIdx = Math.min(n - 1, Math.floor((t - T_SCAN_END) / segDur));
    }
    drawBackdrop(ctx, t, beforeToAfter, heroIdx);

    // Beat punch during the showcase
    let punch = 0;
    if (t >= T_SCAN_END && t < T_SHOW_END) {
      punch = Math.exp(-(((t - T_SCAN_END) % BEAT) * 9));
    }
    const scale = 1 + 0.012 * punch + (sinceImpact >= 0 && sinceImpact < 0.4 ? 0.035 * (1 - sinceImpact / 0.4) : 0);

    let showcase: { idx: number; u: number } | null = null;
    let baX = 0;
    let frameAlpha = 1;

    if (t < T_INTRO_END) paintFrameIntro(t);
    else if (t < T_SCAN_END) paintFrameScan(t);
    else if (t < T_SHOW_END) showcase = paintFrameShowcase(t);
    else if (t < T_BA_END) baX = paintFrameBeforeAfter(t).x;
    else {
      paintFrameBeforeAfter(T_BA_END - 0.001);
      frameAlpha = 1 - easeInOutCubic(clamp01((t - T_BA_END) / 0.9));
    }

    // Frame onto the stage
    ctx.save();
    ctx.translate(W / 2 + sx, FRAME.y + FRAME.h / 2 + sy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = frameAlpha;
    ctx.drawImage(frameCanvas, -W / 2, -FRAME.h / 2);
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);

    // ---------------- PROLOGUE overlay ----------------
    if (t < T_INTRO_END) {
      const fadeIn = clamp01(t / 0.7);
      header(ctx, fadeIn, 'AI TUNING STUDIO');
      ctx.save();
      setFont(ctx, 900, 86);
      revealText(ctx, 'ZAVOD HOLATI', W / 2, 1560, 86, 6, clamp01((t - 0.35) / 1.0), 'center', '#FFFFFF');
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = easeOutCubic((t - 1.0) / 0.6);
      ctx.fillStyle = `${GOLD_SOFT}0.9)`;
      setFont(ctx, 700, 28);
      spaced(ctx, carName.length > 34 ? `${carName.slice(0, 33)}…` : carName, W / 2, 1632, 8, 'center');
      ctx.restore();
      brackets(ctx, clamp01((t - 0.2) / 1.2), 0.55);
    }

    // ---------------- SCAN overlay ----------------
    if (t >= T_INTRO_END && t < T_SCAN_END) {
      const p = clamp01((t - T_INTRO_END) / (T_SCAN_END - T_INTRO_END));
      header(ctx, 1, '4K NEYRO-SKANER');
      brackets(ctx, 1, 1);
      const pct = Math.floor(easeInOutCubic(p) * 100);
      ctx.fillStyle = '#FFFFFF';
      setFont(ctx, 900, 150);
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, W / 2, 1565);
      ctx.fillStyle = `${GOLD_SOFT}0.95)`;
      setFont(ctx, 700, 28);
      spaced(ctx, 'AI FITMENT  ·  GEOMETRIYA  ·  YORUG‘LIK', W / 2, 1640, 6, 'center');
      // progress rail
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(140, 1700, W - 280, 5);
      ctx.fillStyle = GOLD;
      ctx.fillRect(140, 1700, (W - 280) * easeInOutCubic(p), 5);
    }

    // ---------------- IMPACT ----------------
    if (sinceImpact >= 0 && sinceImpact < 1.5) {
      // Shockwave ring
      const rp = easeOutExpo(sinceImpact / 1.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `${GOLD_SOFT}${(0.7 * (1 - clamp01(sinceImpact / 1.1))).toFixed(3)})`;
      ctx.lineWidth = 6 + 30 * (1 - rp);
      ctx.beginPath();
      ctx.arc(W / 2, FRAME.y + FRAME.h / 2, 80 + rp * 900, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ---------------- SHOWCASE overlay ----------------
    if (showcase) {
      const local = t - T_SCAN_END;
      header(ctx, 1, carName.length > 30 ? 'TUNING NATIJASI' : carName);
      // Title slam in the first 1.4s
      if (local < 1.6) {
        const inP = clamp01(local / 0.35);
        const outP = 1 - clamp01((local - 1.2) / 0.4);
        ctx.save();
        ctx.globalAlpha = outP;
        const s = lerp(1.7, 1, easeOutBack(inP));
        ctx.translate(W / 2, 360);
        ctx.scale(s, s);
        setFont(ctx, 900, 150);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('TUNING', 0, 0);
        setFont(ctx, 800, 44);
        ctx.fillStyle = GOLD;
        spaced(ctx, 'NATIJASI', 0, 70, 24, 'center');
        ctx.restore();
      }
      brackets(ctx, 1, 0.7);
      lowerThird(ctx, showcase.idx, showcase.u);
      progressDashes(ctx, t);
    }

    // ---------------- BEFORE / AFTER overlay ----------------
    if (t >= T_SHOW_END && t < T_BA_END) {
      const p = clamp01((t - T_SHOW_END) / (T_BA_END - T_SHOW_END));
      header(ctx, 1, 'OLDIN VA KEYIN');
      brackets(ctx, 1, 0.7);
      ctx.save();
      ctx.globalAlpha = easeOutCubic(p / 0.15);
      setFont(ctx, 900, 70);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      spaced(ctx, 'OLDIN', 90, 1500, 10, 'left');
      ctx.fillStyle = GOLD;
      spaced(ctx, 'KEYIN', W - 90, 1500, 10, 'right');
      ctx.restore();
      // Handle
      const hy = FRAME.y + FRAME.h / 2;
      ctx.save();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(baX, hy, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.moveTo(baX - 8, hy - 14);
      ctx.lineTo(baX - 20, hy);
      ctx.lineTo(baX - 8, hy + 14);
      ctx.closePath();
      ctx.moveTo(baX + 8, hy - 14);
      ctx.lineTo(baX + 20, hy);
      ctx.lineTo(baX + 8, hy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ---------------- OUTRO ----------------
    if (t >= T_BA_END) {
      const p = t - T_BA_END;
      // Darken into the brand card
      ctx.save();
      ctx.globalAlpha = easeInOutCubic(p / 0.8) * 0.88;
      ctx.fillStyle = BG;
      ctx.fillRect(-40, -40, W + 80, H + 80);
      ctx.restore();

      const cy = 800;
      // Expanding gold line
      const lineP = easeOutExpo((p - 0.1) / 0.9);
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 330 * lineP, cy + 70);
      ctx.lineTo(W / 2 + 330 * lineP, cy + 70);
      ctx.stroke();

      // Mark: rotated square outline with inner diamond
      const markP = easeOutBack((p - 0.05) / 0.7);
      ctx.translate(W / 2, cy - 250);
      ctx.rotate(Math.PI / 4);
      ctx.scale(markP, markP);
      ctx.globalAlpha = clamp01(p / 0.4);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 5;
      ctx.strokeRect(-70, -70, 140, 140);
      ctx.fillStyle = `${GOLD_SOFT}0.28)`;
      ctx.fillRect(-36, -36, 72, 72);
      ctx.restore();

      ctx.save();
      setFont(ctx, 900, 118);
      revealText(ctx, 'CARVISION', W / 2, cy, 118, 14, clamp01((p - 0.15) / 0.9), 'center', '#FFFFFF');
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = easeOutCubic((p - 0.7) / 0.6);
      ctx.fillStyle = GOLD;
      setFont(ctx, 700, 34);
      spaced(ctx, 'MASHINANGIZNI TUNINGDAN OLDIN KO‘RING', W / 2, cy + 140, 5, 'center');
      ctx.restore();

      // Chosen parts
      if (parts.length > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        setFont(ctx, 700, 34);
        ctx.textAlign = 'center';
        parts.slice(0, 4).forEach((part, i) => {
          const a = easeOutCubic((p - 1.0 - i * 0.14) / 0.45);
          if (a <= 0) return;
          ctx.globalAlpha = a;
          ctx.fillText(truncate(ctx, part.name, W - 200), W / 2, cy + 260 + i * 62 + (1 - a) * 20);
        });
        ctx.restore();
      }

      if (cfg.brandName) {
        ctx.save();
        ctx.globalAlpha = easeOutCubic((p - 1.4) / 0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        setFont(ctx, 600, 26);
        spaced(ctx, `TAYYORLADI:  ${cfg.brandName.toUpperCase()}`.slice(0, 48), W / 2, 1620, 6, 'center');
        ctx.restore();
      }

      // Soft vertical light on the logo
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createRadialGradient(W / 2, cy - 100, 20, W / 2, cy - 100, 700);
      lg.addColorStop(0, `${GOLD_SOFT}${(0.14 * easeOutCubic(p / 1.2)).toFixed(3)})`);
      lg.addColorStop(1, 'rgba(212,174,98,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    ctx.restore(); // shake translate

    // ---------------- Global finish ----------------
    // Impact + cut flashes
    let flash = 0;
    if (sinceImpact >= 0 && sinceImpact < 0.4) flash = 0.9 * Math.pow(1 - sinceImpact / 0.4, 2);
    if (sinceFinal >= 0 && sinceFinal < 0.3) flash = Math.max(flash, 0.6 * Math.pow(1 - sinceFinal / 0.3, 2));
    if (t >= T_SCAN_END && t < T_SHOW_END) {
      const cut = (t - T_SCAN_END) % segDur;
      if (cut < 0.12 && t - T_SCAN_END > 0.1) flash = Math.max(flash, 0.22 * (1 - cut / 0.12));
    }
    if (flash > 0.002) {
      ctx.fillStyle = `rgba(255,248,230,${flash.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    drawGrain(ctx, t, 0.07);

    // Fade from / to black
    const fadeIn = 1 - clamp01(t / 0.5);
    const fadeOut = clamp01((t - (REEL_DURATION - 0.7)) / 0.7);
    const black = Math.max(fadeIn, fadeOut);
    if (black > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${black.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  return { draw };
}
