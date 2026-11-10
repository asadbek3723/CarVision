// Builds the "choose your car" banner picture (public/assets/car-banner-v1.webp) from the hero car photo:
// the car sits on the right, its front half dissolves into a soft blur and then into the page colour on
// the left, where the text goes. Run: node scripts/make-car-banner.mjs   (needs `sharp`)
import sharp from 'sharp';

const W = 1536, H = 640;
const BG = { r: 10, g: 11, b: 15 };

const hero = await sharp('public/assets/car-hero-v3.webp').toBuffer();
const meta = await sharp(hero).metadata();
// Crop to the car, scale so it fills the right two thirds.
const crop = await sharp(hero).extract({ left: 90, top: 150, width: meta.width - 150, height: 560 }).toBuffer();
const carW = 1120;
const car = await sharp(crop).resize({ width: carW }).toBuffer();
const carH = (await sharp(car).metadata()).height;
const left = W - carW + 60, top = Math.round((H - carH) / 2) + 10;

const mask = (stops) => Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
// Sharp car: invisible on the far left, fully visible from ~45% of the width.
const sharpMask = mask('<stop offset="0.28" stop-color="#000"/><stop offset="0.52" stop-color="#fff"/>');
// Blurred car: strong on the left, gone on the right.
const blurMask = mask('<stop offset="0.25" stop-color="#fff"/><stop offset="0.62" stop-color="#000"/>');

const layer = (buf) => sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: buf, left, top }]).png().toBuffer();
// Feather the crop's own edges (floor reflections end in a straight line otherwise).
const feather = await sharp(Buffer.from(`<svg width="${W}" height="${H}"><rect x="${left + 70}" y="${top + 24}" width="${carW - 100}" height="${carH - 70}" rx="60" fill="#fff"/></svg>`)).blur(34).png().toBuffer();
const carLayer = await sharp(await layer(car)).composite([{ input: feather, blend: 'dest-in' }]).png().toBuffer();
const sharpLayer = await sharp(carLayer).composite([{ input: sharpMask, blend: 'dest-in' }]).png().toBuffer();
const blurLayer = await sharp(carLayer).blur(22).modulate({ brightness: 1.25, saturation: 1.1 }).composite([{ input: blurMask, blend: 'dest-in' }]).png().toBuffer();

// Warm gold light behind the car, and a darker floor.
const glow = Buffer.from(`<svg width="${W}" height="${H}"><defs>
  <radialGradient id="a" cx="68%" cy="62%" r="55%"><stop offset="0" stop-color="#d4ae62" stop-opacity="0.22"/><stop offset="1" stop-color="#d4ae62" stop-opacity="0"/></radialGradient>
  <radialGradient id="b" cx="22%" cy="30%" r="40%"><stop offset="0" stop-color="#fdc902" stop-opacity="0.07"/><stop offset="1" stop-color="#fdc902" stop-opacity="0"/></radialGradient>
</defs><rect width="${W}" height="${H}" fill="url(#a)"/><rect width="${W}" height="${H}" fill="url(#b)"/></svg>`);

await sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } } })
  .composite([{ input: glow }, { input: blurLayer }, { input: sharpLayer }])
  .webp({ quality: 84 })
  .toFile('public/assets/car-banner-v1.webp');
console.log('car-banner-v1.webp', W, H);
