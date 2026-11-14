import { describe, expect, it } from 'vitest';
import { hasFault, modelOf, summarizeQuality } from './render-quality';

describe('render quality summary', () => {
  it('reads the model out of the provider column', () => {
    expect(modelOf('gemini-ai:gemini-3.1-flash-image')).toBe('gemini-3.1-flash-image');
    expect(modelOf('cloudflare-ai')).toBe('cloudflare-ai');
    expect(modelOf(null)).toBe('unknown');
  });

  it('a check with any false field is a fault; a missing check is not', () => {
    expect(hasFault({ sameView: true, sameCar: true, keepsRest: false, partsComplete: true })).toBe(true);
    expect(hasFault({ sameView: true, sameCar: true, keepsRest: true, partsComplete: true })).toBe(false);
    expect(hasFault(null)).toBe(false);
  });

  it('counts per model and per part type, worst first', () => {
    const { byModel, byPart } = summarizeQuality([
      { provider: 'gemini-ai:a', parts: [{ name: 'BBS', category: 'Wheels' }], render_check: { keepsRest: true }, feedback: null },
      { provider: 'cloudflare-ai:b', parts: [{ name: 'GT', category: 'Bumper' }], render_check: { sameCar: false, retried: true }, feedback: 'bad' },
      { provider: 'cloudflare-ai:b', parts: [{ name: 'Tonirovka 5%', category: 'Tint' }], render_check: null, feedback: null },
    ]);
    expect(byModel[0]).toEqual({ key: 'b', renders: 2, checked: 1, faults: 1, retried: 1, disliked: 1 });
    expect(byModel[1]?.key).toBe('a');
    expect(byPart[0]?.key).toBe('bumper');
    expect(byPart.map((l) => l.key).sort()).toEqual(['bumper', 'tint', 'wheels']);
  });
});
