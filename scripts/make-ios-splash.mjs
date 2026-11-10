// Builds the iPhone / iPad launch images (apple-touch-startup-image) into public/splash.
// Run: node scripts/make-ios-splash.mjs   (needs `sharp`, already in node_modules)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BG = '#0A0B0F';
// [css width, css height, device pixel ratio]
export const DEVICES = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [810, 1080, 2], [834, 1112, 2], [768, 1024, 2],
];

mkdirSync('public/splash', { recursive: true });
for (const [w, h, r] of DEVICES) {
  const W = w * r, H = h * r;
  const size = Math.round(Math.min(W, H) * 0.3);
  const icon = await sharp('public/icons/icon-512.png').resize(size, size).composite([{
    input: Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}"/></svg>`),
    blend: 'dest-in',
  }]).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
    .composite([{ input: icon, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(`public/splash/${W}x${H}.png`);
}
console.log('splash images:', DEVICES.length);
