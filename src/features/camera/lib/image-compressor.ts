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
  quality: number = 0.85,
  /**
   * Turns the frame upright. Needed when the screen is locked to portrait but the phone is held
   * sideways: the browser keeps delivering portrait frames, so the car arrives on its side.
   * 90 = rotate clockwise, -90 = counter-clockwise.
   */
  rotateDeg: 0 | 90 | -90 = 0
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

  const quarterTurn = rotateDeg !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = quarterTurn ? targetHeight : targetWidth;
  canvas.height = quarterTurn ? targetWidth : targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context for compression');
  }

  // Draw frame (around the canvas centre when it has to be turned upright)
  if (quarterTurn) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    ctx.drawImage(video, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  } else {
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  }

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

/**
 * Makes sure a captured photo (data URL) fits the render request limit before it is sent.
 * Hosting platforms reject request bodies of about 4.5 MB, so anything bigger is re-encoded as a
 * smaller JPEG. Photos that already fit, and non data URLs, are returned unchanged.
 */
export async function fitDataUrlToLimit(dataUrl: string, maxChars = 3_200_000): Promise<string> {
  if (!dataUrl.startsWith('data:image/') || dataUrl.length <= maxChars) return dataUrl;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    let side = Math.min(2048, Math.max(bitmap.width, bitmap.height));
    let quality = 0.85;
    for (let attempt = 0; attempt < 8; attempt++) {
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= maxChars) {
        bitmap.close();
        return url;
      }
      if (quality > 0.6) quality -= 0.1;
      else side = Math.round(side * 0.8);
    }
    bitmap.close();
  } catch {
    // keep the original: the server answers with a clear error if it is really too large
  }
  return dataUrl;
}
