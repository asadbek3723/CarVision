/**
 * Browser-side image helpers for the product studio: compression before upload,
 * a real quality check (size, brightness, sharpness) and the studio background
 * composition for cut-out products. Product pixels are never regenerated.
 */

export interface QualityReport {
  /** true = fine to upload. Blocking problems set this to false. */
  ok: boolean;
  blocking: string[];
  warnings: string[];
  width: number;
  height: number;
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    // The decoded image stays valid after revoking.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Rasmni ochib bo‘lmadi'));
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Rasmni saqlab bo‘lmadi'))), type, quality);
  });
}

/** Resizes to max 1600px and re-encodes as JPEG, targeting well below the 4MB upload limit. */
export async function compressForUpload(img: HTMLImageElement): Promise<Blob> {
  const canvas = drawScaled(img, 1600);
  // White backdrop so transparent PNGs do not turn black in JPEG
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const fctx = flat.getContext('2d')!;
  fctx.fillStyle = '#ffffff';
  fctx.fillRect(0, 0, flat.width, flat.height);
  fctx.drawImage(canvas, 0, 0);
  let quality = 0.88;
  let blob = await canvasToBlob(flat, 'image/jpeg', quality);
  while (blob.size > 3.4 * 1024 * 1024 && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToBlob(flat, 'image/jpeg', quality);
  }
  return blob;
}

export function analyzeQuality(img: HTMLImageElement): QualityReport {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (Math.min(width, height) < 500) {
    blocking.push(`Rasm juda kichik (${width}×${height}). Kamida 500 pikselli rasm kerak`);
  } else if (Math.min(width, height) < 800) {
    warnings.push('Rasm o‘lchami kichikroq. Yaxshiroq natija uchun kattaroq rasm oling');
  }

  const canvas = drawScaled(img, 256);
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
    gray[i] = g;
    sum += g;
  }
  const mean = sum / (w * h);
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) varSum += (gray[i]! - mean) ** 2;
  const std = Math.sqrt(varSum / gray.length);

  // Variance of the Laplacian: low = blurry
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i]! - gray[i - 1]! - gray[i + 1]! - gray[i - w]! - gray[i + w]!;
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const lapVar = n ? lapSq / n - (lapSum / n) ** 2 : 0;

  if (mean < 40) warnings.push('Rasm juda qorong‘i. Yorug‘roq joyda oling');
  else if (mean > 228) warnings.push('Rasm haddan tashqari yorqin. Yorug‘likni kamaytiring');
  if (std < 22) warnings.push('Rasm yassi va kontrastsiz. Detal fondan ajralib turishi kerak');
  if (lapVar < 35) warnings.push('Rasm xira ko‘rinadi. Kamerani to‘g‘rilab qayta oling');

  return { ok: blocking.length === 0, blocking, warnings, width, height };
}

/** Bounding box of non-transparent pixels, measured on a downscaled copy. */
function opaqueBounds(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const canvas = drawScaled(img, 400);
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  const sx = img.naturalWidth / w;
  const sy = img.naturalHeight / h;
  return { x: minX * sx, y: minY * sy, w: (maxX - minX + 1) * sx, h: (maxY - minY + 1) * sy };
}

/**
 * Places a cut-out product (transparent PNG) on a clean studio background with a soft
 * contact shadow. Returns a JPEG blob (1600x1200).
 */
export async function composeStudioImage(cutout: HTMLImageElement): Promise<Blob> {
  const W = 1600;
  const H = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H * 0.5, W * 0.75);
  bg.addColorStop(0, '#2a2d36');
  bg.addColorStop(0.55, '#14161c');
  bg.addColorStop(1, '#08090c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Floor
  const floor = ctx.createLinearGradient(0, H * 0.7, 0, H);
  floor.addColorStop(0, 'rgba(255,255,255,0.05)');
  floor.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, H * 0.7, W, H * 0.3);

  const b = opaqueBounds(cutout);
  const maxW = W * 0.78;
  const maxH = H * 0.66;
  const scale = Math.min(maxW / b.w, maxH / b.h);
  const dw = b.w * scale;
  const dh = b.h * scale;
  const dx = (W - dw) / 2;
  const dy = H * 0.5 - dh / 2 - H * 0.02;

  // Contact shadow
  ctx.save();
  ctx.translate(W / 2, dy + dh + H * 0.015);
  ctx.scale(1, 0.12);
  const sh = ctx.createRadialGradient(0, 0, 10, 0, 0, dw * 0.55);
  sh.addColorStop(0, 'rgba(0,0,0,0.65)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, dw * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Faint reflection
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.translate(0, (dy + dh) * 2 + H * 0.03);
  ctx.scale(1, -1);
  ctx.drawImage(cutout, b.x, b.y, b.w, b.h, dx, dy, dw, dh);
  ctx.restore();
  const fade = ctx.createLinearGradient(0, dy + dh, 0, dy + dh + dh * 0.45);
  fade.addColorStop(0, 'rgba(10,11,15,0)');
  fade.addColorStop(0.6, 'rgba(10,11,15,0.96)');
  fade.addColorStop(1, 'rgba(10,11,15,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, dy + dh + 2, W, dh * 0.5);

  ctx.drawImage(cutout, b.x, b.y, b.w, b.h, dx, dy, dw, dh);

  return canvasToBlob(canvas, 'image/jpeg', 0.92);
}
