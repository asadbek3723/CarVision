/**
 * CarVision Client-Side Image Compressor
 * Resizes camera frame to max 2048px and converts to lightweight WebP (< 400KB)
 */

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function compressFrameToWebP(
  video: HTMLVideoElement,
  maxDimension: number = 2048,
  quality: number = 0.85
): Promise<CompressResult> {
  const sourceWidth = video.videoWidth || 1920;
  const sourceHeight = video.videoHeight || 1080;

  // Calculate proportional resize
  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context for compression');
  }

  // Draw frame
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

  const blob = await encodeCanvas(canvas, quality);
  return { blob, width: canvas.width, height: canvas.height, sizeBytes: blob.size };
}

/** Largest encoded photo we hand to the network (the data URL is ~1.37x this). */
export const MAX_UPLOAD_BYTES = 1_200_000;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Encodes a canvas small enough to upload. iOS Safari silently ignores `image/webp` and returns a
 * PNG instead (several MB for a 2048px frame, which the server then rejects), so the result type
 * is checked, JPEG is used as the fallback and quality / size are lowered until it fits.
 */
export async function encodeCanvas(canvas: HTMLCanvasElement, quality = 0.85, maxBytes = MAX_UPLOAD_BYTES): Promise<Blob> {
  let work = canvas;
  let q = quality;
  for (let attempt = 0; attempt < 6; attempt++) {
    let blob = await toBlob(work, 'image/webp', q);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(work, 'image/jpeg', q);
    if (!blob) throw new Error('Rasmni kodlab bo‘lmadi');
    if (blob.size <= maxBytes) return blob;
    if (q > 0.6) {
      q -= 0.12;
    } else {
      const smaller = document.createElement('canvas');
      smaller.width = Math.max(320, Math.round(work.width * 0.8));
      smaller.height = Math.max(240, Math.round(work.height * 0.8));
      smaller.getContext('2d')?.drawImage(work, 0, 0, smaller.width, smaller.height);
      work = smaller;
    }
  }
  const last = await toBlob(work, 'image/jpeg', 0.5);
  if (!last) throw new Error('Rasmni kodlab bo‘lmadi');
  return last;
}

/** Re-encodes any image blob (e.g. a queued photo) to fit the upload limit. */
export async function shrinkImageBlob(blob: Blob, maxSide = 1600): Promise<Blob> {
  if (blob.size <= MAX_UPLOAD_BYTES && /^image\/(jpeg|webp)$/.test(blob.type)) return blob;
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return encodeCanvas(canvas, 0.82);
}

/**
 * Shrinks an uploaded photo (a raw phone photo is often 5-10 MB) to a JPEG data URL.
 * Falls back to null when the file cannot be decoded as an image.
 */
export async function compressFileToDataUrl(file: File, maxSide = 1600, quality = 0.85): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let q = quality;
    let url = canvas.toDataURL('image/jpeg', q);
    while (url.length > MAX_UPLOAD_BYTES * 1.37 && q > 0.4) {
      q -= 0.1;
      url = canvas.toDataURL('image/jpeg', q);
    }
    return url;
  } catch {
    return null;
  }
}
