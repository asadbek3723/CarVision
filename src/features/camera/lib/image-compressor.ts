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
  quality: number = 0.82
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode image to WebP'));
          return;
        }
        resolve({
          blob,
          width: targetWidth,
          height: targetHeight,
          sizeBytes: blob.size,
        });
      },
      'image/webp',
      quality
    );
  });
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
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}
