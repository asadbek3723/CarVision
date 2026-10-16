/**
 * CarVision Client-Side Video Sequencer
 * Procedural timeline with 808 bass-drop camera shake and whip-pan transitions.
 */

export interface VideoFrameParams {
  timeSeconds: number; // Current playback time (0.0 to 11.0s)
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  angleImages: HTMLImageElement[];
  shopName?: string | undefined;
}

// 808 Bass Drop timestamps (seconds)
const BASS_DROPS = [1.8, 3.6, 5.4, 7.2];

export function renderReelFrame({
  timeSeconds,
  canvas,
  ctx,
  angleImages,
  shopName = 'Verified Tuning Workshop'
}: VideoFrameParams): void {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Background dark gradient
  const bgGradient = ctx.createRadialGradient(
    width / 2, height / 2, 50,
    width / 2, height / 2, width
  );
  bgGradient.addColorStop(0, '#12141A');
  bgGradient.addColorStop(1, '#0A0B0F');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 1. Check if we are in the Outro Endcard (Seconds 9.0 to 11.0)
  if (timeSeconds >= 9.0) {
    renderOutroEndcard(ctx, width, height, timeSeconds - 9.0, shopName ?? 'Verified Tuning Workshop');
    return;
  }

  // 2. Determine which angle image to display based on timeline
  const availableImages = angleImages.filter((img) => img.complete && img.naturalWidth > 0);
  if (availableImages.length === 0) {
    return;
  }

  const segmentDuration = 9.0 / availableImages.length;
  const currentSegmentIndex = Math.min(
    Math.floor(timeSeconds / segmentDuration),
    availableImages.length - 1
  );
  const currentImage = availableImages[currentSegmentIndex]!;
  const segmentProgress = (timeSeconds % segmentDuration) / segmentDuration;

  // 3. Procedural Zoom-Punch Effect
  const zoomScale = 1.0 + 0.08 * segmentProgress;

  // 4. Calculate 808 Bass-Drop Camera Shake
  let shakeX = 0;
  let shakeY = 0;

  for (const dropTime of BASS_DROPS) {
    const timeSinceDrop = timeSeconds - dropTime;
    if (timeSinceDrop >= 0 && timeSinceDrop < 0.35) {
      const intensity = 24 * Math.exp(-9 * timeSinceDrop);
      shakeX = intensity * Math.sin(timeSinceDrop * 45);
      shakeY = intensity * Math.cos(timeSinceDrop * 35);
      break;
    }
  }

  // Draw Vehicle Image with zoom & shake transforms
  ctx.save();
  ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
  ctx.scale(zoomScale, zoomScale);

  const imgAspect = currentImage.naturalWidth / currentImage.naturalHeight;
  const targetWidth = width * 0.95;
  const targetHeight = targetWidth / imgAspect;

  ctx.drawImage(
    currentImage,
    -targetWidth / 2,
    -targetHeight / 2,
    targetWidth,
    targetHeight
  );
  ctx.restore();

  // Subtle Watermark Pill in Top Corner
  ctx.save();
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('CarVision 4K', 40, 70);
  ctx.restore();
}

function renderOutroEndcard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  outroElapsed: number,
  shopName: string
): void {
  const alpha = Math.min(1.0, outroElapsed * 1.5);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Glowing CarVision Logo
  ctx.textAlign = 'center';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillStyle = '#19D3FF';
  ctx.shadowColor = 'rgba(25, 211, 255, 0.8)';
  ctx.shadowBlur = 35;
  ctx.fillText('CarVision', width / 2, height / 2 - 40);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('AI Automotive Visualizer', width / 2, height / 2 + 15);

  // Workshop Attribution
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`Tuned at ${shopName}`, width / 2, height / 2 + 65);

  ctx.restore();
}
