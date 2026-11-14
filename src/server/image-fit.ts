import sharp from 'sharp';

export type FitImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Below this difference (1%) the before/after slider stretches the picture invisibly: no crop, no re-encode. */
const TOLERANCE = 0.01;

/** The centred crop box with `aspect` (width / height) inside a `width` x `height` picture. */
export function cropBox(width: number, height: number, aspect: number): { left: number; top: number; width: number; height: number } | null {
  if (!(width > 0 && height > 0 && aspect > 0)) return null;
  const current = width / height;
  if (Math.abs(current - aspect) / aspect <= TOLERANCE) return null;
  if (current > aspect) {
    const w = Math.max(1, Math.round(height * aspect));
    return { left: Math.floor((width - w) / 2), top: 0, width: w, height };
  }
  const h = Math.max(1, Math.round(width / aspect));
  return { left: 0, top: Math.floor((height - h) / 2), width, height: h };
}

/**
 * Crops a rendered picture to the customer's photo aspect ratio (centred), so the before and after
 * pictures lie exactly on top of each other. Only Gemini is told the photo's ratio; the other models
 * answer square or in their own sizes. A picture that already fits, or cannot be read, is returned
 * untouched: this never fails a render.
 */
export async function cropToAspect(
  buffer: Buffer,
  contentType: FitImageType,
  aspect: number | null
): Promise<{ buffer: Buffer; contentType: FitImageType }> {
  if (!aspect || !(aspect > 0)) return { buffer, contentType };
  try {
    const img = sharp(buffer, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    // `rotate()` applies EXIF orientation: swap the sides when the picture is turned by 90 degrees.
    const turned = (meta.orientation ?? 1) >= 5;
    const width = turned ? meta.height : meta.width;
    const height = turned ? meta.width : meta.height;
    const box = width && height ? cropBox(width, height, aspect) : null;
    if (!box) return { buffer, contentType };
    const cropped = img.extract(box);
    const out =
      contentType === 'image/png'
        ? await cropped.png().toBuffer()
        : contentType === 'image/webp'
          ? await cropped.webp({ quality: 92 }).toBuffer()
          : await cropped.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    return { buffer: out, contentType };
  } catch (err) {
    console.warn('render crop skipped:', err instanceof Error ? err.message : 'unknown');
    return { buffer, contentType };
  }
}
