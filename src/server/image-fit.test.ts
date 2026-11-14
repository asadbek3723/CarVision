import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { cropBox, cropToAspect } from './image-fit';

const picture = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#336699' } }).jpeg().toBuffer();

describe('cropBox', () => {
  it('crops a square render to a 4:3 photo from the middle', () => {
    expect(cropBox(1024, 1024, 4 / 3)).toEqual({ left: 0, top: 128, width: 1024, height: 768 });
  });
  it('crops a wide render to a portrait photo from the middle', () => {
    expect(cropBox(1600, 900, 3 / 4)).toEqual({ left: 462, top: 0, width: 675, height: 900 });
  });
  it('leaves a picture that already fits (within 1%) alone', () => {
    expect(cropBox(1376, 1024, 4 / 3)).toBeNull();
    expect(cropBox(0, 10, 1)).toBeNull();
  });
});

describe('cropToAspect', () => {
  it('returns a picture with the photo aspect ratio', async () => {
    const out = await cropToAspect(await picture(1024, 1024), 'image/jpeg', 4 / 3);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(768);
    expect(out.contentType).toBe('image/jpeg');
  });
  it('never fails a render: unreadable bytes come back untouched', async () => {
    const junk = Buffer.from('not an image');
    expect((await cropToAspect(junk, 'image/jpeg', 4 / 3)).buffer).toBe(junk);
    const ok = await picture(400, 300);
    expect((await cropToAspect(ok, 'image/jpeg', null)).buffer).toBe(ok);
  });
});
