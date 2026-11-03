/**
 * CarVision Client-Side Luma & Exposure Quality Analyzer
 * Evaluates brightness to alert user in dimly lit garage bays.
 */

export interface LumaAnalysisResult {
  avgLuma: number;
  isTooDark: boolean;
  isOverexposed: boolean;
}

export function analyzeFrameLuma(video: HTMLVideoElement): LumaAnalysisResult {
  const sampleWidth = 160;
  const sampleHeight = 90;

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { avgLuma: 128, isTooDark: false, isOverexposed: false };
  }

  ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;

  let totalLuma = 0;
  const totalPixels = sampleWidth * sampleHeight;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    // Standard Rec. 601 luma formula
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuma += luma;
  }

  const avgLuma = Math.round(totalLuma / totalPixels);

  return {
    avgLuma,
    isTooDark: avgLuma < 24,
    isOverexposed: avgLuma > 240,
  };
}
