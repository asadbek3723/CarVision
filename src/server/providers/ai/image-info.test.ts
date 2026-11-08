import { describe, expect, it } from 'vitest';
import { dataUriBytes, nearestAspectRatio, readImageDims, sniffImage } from './image-info';

const png = (w: number, h: number) => {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};

/** SOI + a 5-byte APP0 segment + SOF0 with the given size. */
const jpeg = (w: number, h: number) => {
  const b = Buffer.alloc(40);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0;
  b.writeUInt16BE(7, 4); // APP0 length (covers 5 payload bytes)
  b[11] = 0xff; b[12] = 0xc0; // SOF0 right after APP0
  b.writeUInt16BE(11, 13);
  b[15] = 8;
  b.writeUInt16BE(h, 16);
  b.writeUInt16BE(w, 18);
  return b;
};

const webpVp8x = (w: number, h: number) => {
  const b = Buffer.alloc(32);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8X', 12, 'ascii');
  b.writeUIntLE(w - 1, 24, 3);
  b.writeUIntLE(h - 1, 27, 3);
  return b;
};

describe('image header reader', () => {
  it('reads PNG, JPEG and WebP sizes', () => {
    expect(readImageDims(png(2048, 1152))).toEqual({ width: 2048, height: 1152 });
    expect(readImageDims(jpeg(1600, 900))).toEqual({ width: 1600, height: 900 });
    expect(readImageDims(webpVp8x(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('recognises real images by their bytes, not their label', () => {
    expect(sniffImage(png(1, 1))).toBe('image/png');
    expect(sniffImage(jpeg(1, 1))).toBe('image/jpeg');
    expect(sniffImage(Buffer.from('<html>not an image at all</html>'))).toBeNull();
    expect(readImageDims(Buffer.from('garbage garbage garbage garbage'))).toBeNull();
  });

  it('decodes data URIs and rejects other things', () => {
    const uri = `data:image/png;base64,${png(10, 10).toString('base64')}`;
    expect(dataUriBytes(uri)?.length).toBe(33);
    expect(dataUriBytes('data:text/html;base64,PGgxPg==')).toBeNull();
    expect(dataUriBytes('https://x.test/a.png')).toBeNull();
  });

  it('picks the closest supported aspect ratio', () => {
    expect(nearestAspectRatio(1920, 1080)).toBe('16:9');
    expect(nearestAspectRatio(2048, 1152)).toBe('16:9');
    expect(nearestAspectRatio(1600, 1200)).toBe('4:3');
    expect(nearestAspectRatio(1080, 1920)).toBe('9:16');
    expect(nearestAspectRatio(1000, 1000)).toBe('1:1');
    expect(nearestAspectRatio(3000, 1000)).toBe('21:9');
    expect(nearestAspectRatio(1200, 1500)).toBe('4:5');
  });
});
