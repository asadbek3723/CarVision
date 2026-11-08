/**
 * Tiny, dependency-free image header reader. The render must come back with the same framing as
 * the customer's photo (the before/after slider and the video overlay them), so the aspect ratio
 * of the input is read here and passed to the model, and every returned picture is checked to be a
 * real image before a credit is committed.
 */
export interface ImageDims {
  width: number;
  height: number;
}

export type ImageKind = 'image/jpeg' | 'image/png' | 'image/webp';

/** Detects JPEG / PNG / WebP from the first bytes (never trust a declared mime type). */
export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function jpegSize(buf: Buffer): ImageDims | null {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1]!;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Standalone markers have no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = buf.readUInt16BE(i + 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function pngSize(buf: Buffer): ImageDims | null {
  if (buf.length < 24) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function webpSize(buf: Buffer): ImageDims | null {
  if (buf.length < 30) return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const b = buf.subarray(21, 26);
    return {
      width: 1 + (b[1]! | ((b[2]! & 0x3f) << 8)),
      height: 1 + ((b[2]! >> 6) | (b[3]! << 2) | ((b[4]! & 0x0f) << 10)),
    };
  }
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  return null;
}

export function readImageDims(buf: Buffer): ImageDims | null {
  const kind = sniffImage(buf);
  const dims = kind === 'image/jpeg' ? jpegSize(buf) : kind === 'image/png' ? pngSize(buf) : kind === 'image/webp' ? webpSize(buf) : null;
  return dims && dims.width > 0 && dims.height > 0 ? dims : null;
}

/** Decoded bytes of a `data:image/...;base64,` URI, or null. */
export function dataUriBytes(uri: string): Buffer | null {
  const m = uri.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  const buf = Buffer.from(m[1]!.replace(/\s+/g, ''), 'base64');
  return buf.length > 0 ? buf : null;
}

/** Aspect ratios every Nano Banana model accepts (a subset shared by all of them). */
const RATIOS: Array<{ id: string; value: number }> = [
  ['1:1', 1],
  ['2:3', 2 / 3],
  ['3:2', 3 / 2],
  ['3:4', 3 / 4],
  ['4:3', 4 / 3],
  ['4:5', 4 / 5],
  ['5:4', 5 / 4],
  ['9:16', 9 / 16],
  ['16:9', 16 / 9],
  ['21:9', 21 / 9],
].map(([id, value]) => ({ id: id as string, value: value as number }));

/** The supported aspect ratio closest to width:height (compared on a log scale). */
export function nearestAspectRatio(width: number, height: number): string {
  const target = Math.log(width / height);
  let best = RATIOS[0]!;
  for (const r of RATIOS) {
    if (Math.abs(Math.log(r.value) - target) < Math.abs(Math.log(best.value) - target)) best = r;
  }
  return best.id;
}
