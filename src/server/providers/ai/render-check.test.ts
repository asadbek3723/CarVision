import { describe, expect, it } from 'vitest';
import { parseRenderCheck, renderFaults } from './render-check';

describe('parseRenderCheck', () => {
  it('reads a clear answer', () => {
    expect(parseRenderCheck('{"sameView": false, "sameCar": true, "keepsRest": false, "partsComplete": true, "problem": "shows the side"}')).toEqual({
      sameView: false,
      sameCar: true,
      keepsRest: false,
      partsComplete: true,
      problem: 'shows the side',
    });
  });
  it('treats missing fields as fine and strips code fences', () => {
    expect(parseRenderCheck('```json\n{"partsComplete": false}\n```')).toEqual({
      sameView: true,
      sameCar: true,
      keepsRest: true,
      partsComplete: false,
      problem: '',
    });
  });
  it('returns null for non-JSON', () => {
    expect(parseRenderCheck('not json')).toBeNull();
  });
});

describe('renderFaults', () => {
  const ok = { sameView: true, sameCar: true, keepsRest: true, partsComplete: true, problem: '' };
  it('ranks another side or car above an unwanted change above an unfinished part', () => {
    expect(renderFaults(ok)).toBe(0);
    expect(renderFaults({ ...ok, sameCar: false })).toBeGreaterThan(renderFaults({ ...ok, keepsRest: false }));
    expect(renderFaults({ ...ok, keepsRest: false })).toBeGreaterThan(renderFaults({ ...ok, partsComplete: false }));
  });
});
