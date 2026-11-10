import { describe, expect, it } from 'vitest';
import { CATALOG_CATEGORIES } from '@/domain/catalog';
import { CATEGORY_PROFILE, SHOT_PLANS, lightHint, pitchHint } from './product-shots';

const frame = (fn: (x: number, y: number) => number, w = 32, h = 24) => {
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = fn(x, y);
  return g;
};

describe('product shots', () => {
  it('has a shot plan for every catalog category', () => {
    for (const c of CATALOG_CATEGORIES) expect(SHOT_PLANS[CATEGORY_PROFILE[c.slug]].length).toBeGreaterThan(0);
  });

  it('judges the light', () => {
    expect(lightHint(frame(() => 20), 32, 24)).toBe('dark');
    expect(lightHint(frame(() => 250), 32, 24)).toBe('bright');
    expect(lightHint(frame(() => 130), 32, 24)).toBe('ok');
    // bright window around a dark product
    expect(lightHint(frame((x, y) => (x > 9 && x < 22 && y > 7 && y < 17 ? 60 : 200)), 32, 24)).toBe('backlit');
  });

  it('tells which way to tilt the phone', () => {
    expect(pitchHint(0, 'level')).toBe('ok');
    expect(pitchHint(20, 'level')).toBe('tiltDown');
    expect(pitchHint(-5, 'above')).toBe('tiltDown');
    expect(pitchHint(-30, 'top')).toBe('tiltDown');
    expect(pitchHint(-40, 'level')).toBe('tiltUp');
  });
});
