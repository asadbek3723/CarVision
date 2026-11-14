// Writes public/favicon.ico (16, 32, 48 px, PNG-encoded entries) from public/icons/icon-512.png.
// Browsers and Google ask for /favicon.ico at the site root; without it search results show a globe.
// Run after make-app-icons.mjs: node scripts/make-favicon-ico.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('public/icons/icon-512.png');
const OUT = path.resolve('public/favicon.ico');
const SIZES = [16, 32, 48];

const pngs = await Promise.all(SIZES.map((s) => sharp(SRC).resize(s, s).png({ compressionLevel: 9 }).toBuffer()));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(SIZES.length, 4);

let offset = 6 + 16 * SIZES.length;
const entries = SIZES.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); // width
  e.writeUInt8(s, 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});

await fs.writeFile(OUT, Buffer.concat([header, ...entries, ...pngs]));
console.log(`wrote ${OUT}`);
