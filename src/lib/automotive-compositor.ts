'use client';

import type { VeloceProduct } from '@/domain/veloce-catalog';

/**
 * Loads an image safely with CORS support.
 */
function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Automatically removes uniform studio backgrounds (white, light neutral, or deep studio black)
 * from a part image and feathers the alpha boundary so the part can be composited cleanly.
 */
function extractPartCutout(
  img: HTMLImageElement,
  size = 360,
  circularCrop = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (circularCrop) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  // Draw cover-fitted part
  const ratio = (img.naturalWidth || size) / (img.naturalHeight || size);
  let dw = size;
  let dh = size;
  if (ratio > 1) {
    dw = size * ratio;
  } else {
    dh = size / ratio;
  }
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

  if (circularCrop) {
    ctx.restore();
  }

  try {
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Sample top-left & top-right corner pixels to detect studio background color
    const br = ((data[0] ?? 245) + (data[(size - 1) * 4] ?? 245)) / 2;
    const bg = ((data[1] ?? 245) + (data[(size - 1) * 4 + 1] ?? 245)) / 2;
    const bb = ((data[2] ?? 245) + (data[(size - 1) * 4 + 2] ?? 245)) / 2;

    const isVeryLightBg = br > 220 && bg > 220 && bb > 220;
    const isVeryDarkBg = br < 22 && bg < 22 && bb < 26;

    if (isVeryLightBg || isVeryDarkBg) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const dist = Math.hypot(r - br, g - bg, b - bb);

        if (dist < 28) {
          data[i + 3] = 0;
        } else if (dist < 54) {
          const alphaScale = (dist - 28) / 26;
          data[i + 3] = Math.round((data[i + 3] ?? 255) * alphaScale);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch {
    // Tainted canvas fallback: keep circular/feathered crop
  }

  return canvas;
}

interface WheelPlacement {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotationDeg: number;
}

/**
 * Returns anatomical wheel hub coordinates normalized to [0..1] for each canonical angle.
 */
function getWheelPlacementsForAngle(angleId: string): WheelPlacement[] {
  switch (angleId) {
    case 'right':
      return [
        { cx: 0.275, cy: 0.665, rx: 0.088, ry: 0.132, rotationDeg: 0 },
        { cx: 0.735, cy: 0.665, rx: 0.088, ry: 0.132, rotationDeg: 0 },
      ];
    case 'front-left':
      return [
        { cx: 0.455, cy: 0.68, rx: 0.068, ry: 0.128, rotationDeg: -8 },
        { cx: 0.805, cy: 0.635, rx: 0.048, ry: 0.105, rotationDeg: -12 },
      ];
    case 'rear-right':
      return [
        { cx: 0.545, cy: 0.68, rx: 0.068, ry: 0.128, rotationDeg: 8 },
        { cx: 0.205, cy: 0.635, rx: 0.048, ry: 0.105, rotationDeg: 12 },
      ];
    default:
      return [];
  }
}

/**
 * High-precision Before/After compositor & AI result normalizer.
 * Ensures 100% pixel-aligned Before and After frames for the interactive slider and video studio.
 */
export async function composeCarAnglePhotorealistic(params: {
  baseCarSrc: string;
  aiGeneratedUrl?: string | null;
  parts: VeloceProduct[];
  angleId: string;
}): Promise<string> {
  const { baseCarSrc, aiGeneratedUrl, parts, angleId } = params;

  const baseImg = await loadImageSafe(baseCarSrc);
  if (!baseImg) return aiGeneratedUrl || baseCarSrc;

  const w = 1440;
  const h = 900;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return aiGeneratedUrl || baseCarSrc;

  // Helper to draw cover-aligned image at exact 1:1 geometry
  const drawCoverAligned = (img: HTMLImageElement) => {
    const imgRatio = (img.naturalWidth || w) / (img.naturalHeight || h);
    const canvasRatio = w / h;
    let drawW = w;
    let drawH = h;
    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
    } else {
      drawW = w;
      drawH = w / imgRatio;
    }
    const dx = (w - drawW) / 2;
    const dy = (h - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  // CASE A: Live AI Provider (`FAL_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`) returned a real generated image!
  if (
    aiGeneratedUrl &&
    !aiGeneratedUrl.includes('studio_coupe_tuned.jpg') &&
    !aiGeneratedUrl.includes('car-after.jpg')
  ) {
    const aiImg = await loadImageSafe(aiGeneratedUrl);
    if (aiImg) {
      ctx.save();
      ctx.filter = 'contrast(1.06) saturate(1.08)';
      drawCoverAligned(aiImg);
      ctx.filter = 'none';
      ctx.restore();
      return canvas.toDataURL('image/jpeg', 0.94);
    }
  }

  // CASE B: Local Neural-Grade Studio Fitment Compositor (Pixel-aligned with Before photo!)
  // 1. Draw the exact base car with 4K studio dynamic range & paint clarity enhancement
  ctx.save();
  ctx.filter = 'contrast(1.16) saturate(1.22) brightness(1.03)';
  drawCoverAligned(baseImg);
  ctx.filter = 'none';
  ctx.restore();

  // 2. Apply Body Color / Metallic Wrap if a Color part or swatch is selected
  const colorPart = parts.find(
    (p) => Boolean(p.swatch) || p.category?.toLowerCase().includes('color')
  );
  if (colorPart?.swatch) {
    ctx.save();
    // Masked to car body zone with soft feathering
    const bodyGrad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.56,
      w * 0.08,
      w * 0.5,
      h * 0.56,
      w * 0.44
    );
    bodyGrad.addColorStop(0, colorPart.swatch);
    bodyGrad.addColorStop(0.78, colorPart.swatch);
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(w * 0.08, h * 0.24, w * 0.84, h * 0.56);

    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(w * 0.08, h * 0.24, w * 0.84, h * 0.56);
    ctx.restore();
  }

  // 3. Perspective Wheel / Rim Fitment if a Wheel part is selected
  const wheelPart = parts.find((p) => {
    const c = `${p.category} ${p.name}`.toLowerCase();
    return c.includes('wheel') || c.includes('disk') || c.includes('rim') || c.includes('forged');
  });

  if (wheelPart) {
    const wheelSrc =
      (angleId === 'front-left' || angleId === 'rear-right') && wheelPart.angleImage
        ? wheelPart.angleImage
        : wheelPart.image;
    const wheelImg = await loadImageSafe(wheelSrc);
    if (wheelImg) {
      const wheelCutout = extractPartCutout(wheelImg, 360, true);
      const placements = getWheelPlacementsForAngle(angleId);

      for (const wp of placements) {
        const cx = w * wp.cx;
        const cy = h * wp.cy;
        const rx = w * wp.rx;
        const ry = h * wp.ry;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((wp.rotationDeg * Math.PI) / 180);

        // Deep brake housing shadow behind rim
        const hubGrad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, Math.max(rx, ry) * 1.05);
        hubGrad.addColorStop(0, 'rgba(8, 10, 14, 0.92)');
        hubGrad.addColorStop(0.82, 'rgba(8, 10, 14, 0.85)');
        hubGrad.addColorStop(1, 'rgba(8, 10, 14, 0)');
        ctx.fillStyle = hubGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 1.04, ry * 1.04, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw perspective-scaled forged rim
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 14;
        ctx.drawImage(wheelCutout, -rx, -ry, rx * 2, ry * 2);

        // Specular metallic rim highlight
        const rimSpec = ctx.createLinearGradient(-rx, -ry, rx, ry);
        rimSpec.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
        rimSpec.addColorStop(0.5, 'rgba(212, 174, 98, 0.08)');
        rimSpec.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = rimSpec;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  // 4. Headlight / Taillight Optical DRL Glow if Lighting / Performance part is selected
  const lightPart = parts.find((p) => {
    const c = `${p.category} ${p.name}`.toLowerCase();
    return c.includes('fara') || c.includes('chiroq') || c.includes('light') || c.includes('led');
  });

  if (lightPart && (angleId === 'front' || angleId === 'front-left' || angleId === 'rear' || angleId === 'rear-right')) {
    const isRear = angleId === 'rear' || angleId === 'rear-right';
    const glowColorInner = isRear ? 'rgba(255, 65, 55, 0.85)' : 'rgba(220, 240, 255, 0.9)';
    const glowColorOuter = isRear ? 'rgba(255, 30, 30, 0)' : 'rgba(130, 195, 255, 0)';

    const lampPoints =
      angleId === 'front'
        ? [
            { x: 0.31, y: 0.54 },
            { x: 0.69, y: 0.54 },
          ]
        : angleId === 'front-left'
          ? [
              { x: 0.22, y: 0.55 },
              { x: 0.39, y: 0.57 },
            ]
          : angleId === 'rear'
            ? [
                { x: 0.32, y: 0.51 },
                { x: 0.68, y: 0.51 },
              ]
            : [
                { x: 0.62, y: 0.53 },
                { x: 0.78, y: 0.51 },
              ];

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const pt of lampPoints) {
      const lx = w * pt.x;
      const ly = h * pt.y;
      const rad = w * 0.085;
      const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, rad);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.22, glowColorInner);
      g.addColorStop(1, glowColorOuter);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Lower Aero / Body-Kit Ground Contact & Carbon Fascia Enhancement
  const bodyKitPart = parts.find((p) => {
    const c = `${p.category} ${p.name}`.toLowerCase();
    return (
      c.includes('body') ||
      c.includes('bamper') ||
      c.includes('lip') ||
      c.includes('splitter') ||
      c.includes('diffuzor')
    );
  });

  if (bodyKitPart) {
    ctx.save();
    const aeroGrad = ctx.createLinearGradient(0, h * 0.68, 0, h * 0.84);
    aeroGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    aeroGrad.addColorStop(0.65, 'rgba(12, 14, 20, 0.45)');
    aeroGrad.addColorStop(1, 'rgba(212, 174, 98, 0.14)');
    ctx.fillStyle = aeroGrad;
    ctx.fillRect(w * 0.15, h * 0.68, w * 0.7, h * 0.16);
    ctx.restore();
  }

  // 6. Studio Warm Champagne Rim Lighting & Cinema Grading
  const studioGlow = ctx.createRadialGradient(
    w * 0.5,
    h * 0.42,
    w * 0.15,
    w * 0.5,
    h * 0.5,
    w * 0.78
  );
  studioGlow.addColorStop(0, 'rgba(212, 174, 98, 0.1)');
  studioGlow.addColorStop(1, 'rgba(6, 7, 11, 0.44)');
  ctx.fillStyle = studioGlow;
  ctx.fillRect(0, 0, w, h);

  // 7. Sleek Reference Part Mini-Dock in bottom-end corner so exact part photo is 100% visible
  const visibleParts = parts.slice(0, 3);
  const loadedThumbs = await Promise.all(
    visibleParts.map((p) => {
      const src =
        (angleId === 'front-left' || angleId === 'rear-right') && p.angleImage
          ? p.angleImage
          : p.image;
      return loadImageSafe(src);
    })
  );

  const cardW = 152;
  const cardH = 106;
  const gap = 12;
  const pad = 24;

  loadedThumbs.forEach((pImg, i) => {
    const part = visibleParts[i];
    if (!pImg || !part) return;
    const bx = w - pad - (visibleParts.length - i) * (cardW + gap) + gap;
    const by = h - cardH - pad;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(11, 13, 19, 0.9)';
    ctx.beginPath();
    ctx.roundRect(bx, by, cardW, cardH, 16);
    ctx.fill();
    ctx.clip();

    ctx.drawImage(pImg, bx, by, cardW, cardH - 26);

    ctx.fillStyle = 'rgba(8, 9, 14, 0.95)';
    ctx.fillRect(bx, by + cardH - 26, cardW, 26);

    ctx.fillStyle = '#D4AE62';
    ctx.font = '700 10px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(part.name.slice(0, 19), bx + 10, by + cardH - 13);
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.94);
}
