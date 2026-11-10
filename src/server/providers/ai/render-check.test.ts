import { describe, expect, it } from 'vitest';
import { parseRenderCheck } from './render-check';

describe('parseRenderCheck', () => {
  it('reads a clear answer', () => {
    expect(parseRenderCheck('{"sameView": false, "partsComplete": true, "problem": "shows the side"}')).toEqual({
      sameView: false,
      partsComplete: true,
      problem: 'shows the side',
    });
  });
  it('treats missing fields as fine and strips code fences', () => {
    expect(parseRenderCheck('```json\n{"partsComplete": false}\n```')).toEqual({ sameView: true, partsComplete: false, problem: '' });
  });
  it('returns null for non-JSON', () => {
    expect(parseRenderCheck('not json')).toBeNull();
  });
});
