/**
 * CarVision Client-Side Video Encoder
 * Encodes canvas timeline into an exportable video blob using MediaRecorder
 */

import { renderReelFrame } from './canvas-sequencer';

export interface EncodeReelOptions {
  angleImageUrls: string[];
  shopName?: string;
  fps?: number;
  durationSeconds?: number;
  onProgress?: (progressPercent: number) => void;
}

export async function exportReelVideo({
  angleImageUrls,
  shopName,
  fps = 30,
  durationSeconds = 11.0,
  onProgress
}: EncodeReelOptions): Promise<Blob> {
  // Preload images into HTMLImageElements
  const loadedImages: HTMLImageElement[] = await Promise.all(
    angleImageUrls.map((url) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); // Graceful fallback if image fails
        img.src = url;
      });
    })
  );

  // Setup 9:16 Canvas (720x1280 for fast client rendering)
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : 'video/webm; codecs=vp9';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000, // 4 Mbps high clarity
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);

    recorder.start(100);

    const totalFrames = Math.round(fps * durationSeconds);
    let currentFrame = 0;

    const interval = setInterval(() => {
      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
        return;
      }

      const currentTime = currentFrame / fps;
      renderReelFrame({
        timeSeconds: currentTime,
        canvas,
        ctx,
        angleImages: loadedImages,
        shopName,
      });

      currentFrame++;
      onProgress?.(Math.round((currentFrame / totalFrames) * 100));
    }, 1000 / fps);
  });
}
