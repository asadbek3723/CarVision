// Builds the iPhone / iPad launch images (apple-touch-startup-image) into public/splash.
// They show the same CARVISION wordmark as the in-app launch screen (LaunchSplash.tsx), so the
// handover from the phone's own launch screen to the app's is seamless.
//
// Run: node scripts/make-ios-splash.mjs
// Needs `playwright-core` (already installed) and a Chrome / Chromium, plus internet for the
// Montserrat font. Set CHROME_PATH if Chrome is not in the default macOS location.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BG = '#0A0B0F';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// [css width, css height, device pixel ratio]  (keep identical to src/lib/ios-splash.ts)
const DEVICES = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [810, 1080, 2], [834, 1112, 2], [768, 1024, 2],
];

const html = (fs) => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=block">
<style>
  html,body{margin:0;height:100%;background:${BG};}
  body{display:grid;place-items:center;font-family:'Montserrat',sans-serif;}
  .m{display:flex;flex-direction:column;align-items:center;}
  .w{font-weight:300;font-size:${fs}px;letter-spacing:.42em;padding-inline-start:.42em;color:#f5f5f5;text-transform:uppercase;line-height:1}
  .t{margin-top:${fs * 0.263}px;font-weight:400;font-size:${fs * 0.263}px;letter-spacing:.5em;padding-inline-start:.5em;color:#8b8d94;text-transform:uppercase;line-height:1}
  .l{margin-top:${fs * 0.842}px;height:1px;width:${fs * 2.95}px;background:linear-gradient(90deg,transparent,rgba(212,174,98,.9),transparent);border-radius:1px}
</style>
<div class="m"><div class="w">CarVision</div><div class="t">Drive your vision</div><div class="l"></div></div>`;

mkdirSync('public/splash', { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const [w, h, r] of DEVICES) {
  const fs = w >= 700 ? 54 : w >= 400 ? 38 : 34;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: r });
  const page = await ctx.newPage();
  await page.setContent(html(fs), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/splash/${w * r}x${h * r}.png` });
  await ctx.close();
}
await browser.close();
console.log('splash images:', DEVICES.length);
