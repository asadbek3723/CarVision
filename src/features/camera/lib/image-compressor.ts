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
