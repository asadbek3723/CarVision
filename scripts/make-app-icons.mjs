// Draws the CarVision app icon (the "C" with the car roofline) as a vector on a black background and
// writes every size the platforms ask for: PWA (any + maskable), Apple touch icon, favicons, Windows tile.
// Run: node scripts/make-app-icons.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('public/icons');

// Mark drawn in a 0..810 x 0..640 box.
const MARK = `
  <path fill="url(#silver)" d="
    M300 0 L760 0 L660 110 L345 110 L155 300 L155 340 L345 530 L715 530 L615 640 L300 640
    L14 354 Q0 340 0 320 Q0 300 14 286 Z" />
  <path fill="url(#silverShade)" opacity="0.55" d="M155 300 L155 340 L345 530 L715 530 L615 640 L300 640 L14 354 Q0 340 0 320 Z" />
  <path fill="url(#gold)" d="
    M160 318 C300 250 470 200 600 226 C690 246 762 280 792 332 C814 370 808 408 790 440
    C793 402 781 362 748 336 C700 300 610 282 520 282 C400 282 272 298 160 318 Z" />
  <path fill="url(#gold)" opacity="0.9" d="M250 334 L736 337 L736 346 Z" />
`;

const DEFS = `
  <defs>
    <radialGradient id="bg" cx="34%" cy="26%" r="90%">
      <stop offset="0" stop-color="#1B1E26" />
      <stop offset="0.55" stop-color="#0C0D12" />
      <stop offset="1" stop-color="#040406" />
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#E8BF74" stop-opacity="0.16" />
      <stop offset="1" stop-color="#E8BF74" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#FFFFFF" />
      <stop offset="0.45" stop-color="#E9EBF0" />
      <stop offset="1" stop-color="#A9AEB8" />
    </linearGradient>
    <linearGradient id="silverShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0" />
      <stop offset="1" stop-color="#2A2D35" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="#C9974A" />
      <stop offset="0.5" stop-color="#F3D69B" />
      <stop offset="1" stop-color="#D9A85A" />
    </linearGradient>
  </defs>`;

/** `scale`: mark width as a share of the icon. `bg`: false = transparent (favicon on light tabs keeps a tile). */
function svg(size, scale, { round = 0 } = {}) {
  const s = (size * scale) / 810;
  // The open side of the C reads lighter, so the mark sits a touch right of the true centre.
  const tx = size / 2 - 405 * s + size * 0.012;
  const ty = size / 2 - 320 * s;
  const r = round * size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${DEFS}
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)" />
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="url(#glow)" />
  <g transform="translate(${tx} ${ty}) scale(${s})">${MARK}</g>
</svg>`;
}

async function png(name, size, scale, opts) {
  const buf = Buffer.from(svg(size, scale, opts));
  await sharp(buf, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
  console.log('wrote', name);
}

await fs.mkdir(OUT, { recursive: true });
// Full-bleed squares: iOS, Android launchers and desktops round the corners themselves.
await png('icon-192.png', 192, 0.64);
await png('icon-512.png', 512, 0.64);
await png('apple-touch-icon.png', 180, 0.64);
// Maskable: the mark stays inside the 80% safe circle whatever shape the launcher cuts.
await png('icon-maskable-192.png', 192, 0.5);
await png('icon-maskable-512.png', 512, 0.5);
// Browser tabs and Windows.
await png('favicon-32.png', 32, 0.8, { round: 0.22 });
await png('favicon-48.png', 48, 0.78, { round: 0.22 });
await png('mstile-310.png', 310, 0.6);
// Android notification badge: a plain white mark on transparent (the system tints it).
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <g transform="translate(${48 - 405 * (80 / 810)} ${48 - 320 * (80 / 810)}) scale(${80 / 810})">
    <path fill="#fff" d="M300 0 L760 0 L660 110 L345 110 L155 300 L155 340 L345 530 L715 530 L615 640 L300 640 L14 354 Q0 340 0 320 Q0 300 14 286 Z" />
  </g></svg>`;
await sharp(Buffer.from(badge)).png().toFile(path.join(OUT, 'badge-96.png'));
console.log('wrote badge-96.png');
await fs.writeFile(path.join(OUT, 'icon.svg'), svg(512, 0.72, { round: 0.22 }));
console.log('wrote icon.svg');
