import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceCursor,
  envKeys,
  isCoolingDown,
  keyModelScope,
  keyScope,
  modelScope,
  parseKeys,
  resetCooldowns,
  setCooldown,
  usableKeys,
} from './key-pool';

beforeEach(() => resetCooldowns());

describe('parseKeys / envKeys', () => {
  it('splits commas, whitespace and drops short junk and duplicates', () => {
    expect(parseKeys('aaaaaaaaaa, bbbbbbbbbb\ncccccccccc', 'aaaaaaaaaa', 'x', undefined)).toEqual([
      'aaaaaaaaaa',
      'bbbbbbbbbb',
      'cccccccccc',
    ]);
  });

  it('reads provider keys from env lists and aliases', () => {
    expect(envKeys('openrouter', { OPENROUTER_API_KEYS: 'sk-or-aaaaaa,sk-or-bbbbbb' } as never)).toHaveLength(2);
    expect(envKeys('gemini', { GOOGLE_API_KEY: 'google-key-1' } as never)).toEqual(['google-key-1']);
    expect(envKeys('openai', { OPENAI_API_KEY: 'sk-openai-key' } as never)).toEqual(['sk-openai-key']);
    expect(envKeys('fal', {} as never)).toEqual([]);
  });
});

describe('usableKeys', () => {
  const keys = ['key-aaaaaaaa', 'key-bbbbbbbb', 'key-cccccccc'];

  it('rotates round-robin after a successful key', () => {
    expect(usableKeys('openrouter', keys, 'm').map((k) => k.index)).toEqual([0, 1, 2]);
    advanceCursor('openrouter', 0, keys.length);
    expect(usableKeys('openrouter', keys, 'm').map((k) => k.index)).toEqual([1, 2, 0]);
  });

  it('skips keys cooling down for this model or entirely', () => {
    setCooldown(keyModelScope('openrouter', 0, 'm'), 60_000);
    setCooldown(keyScope('openrouter', 1), 60_000);
    expect(usableKeys('openrouter', keys, 'm').map((k) => k.index)).toEqual([2]);
    // the model-scoped cooldown of key 0 does not hide it for other models
    expect(usableKeys('openrouter', keys, 'other').map((k) => k.index)).toEqual([0, 2]);
  });

  it('returns nothing while the whole model is parked, and cooldowns expire', () => {
    const now = 1_000_000;
    setCooldown(modelScope('openrouter', 'm'), 5_000, now);
    expect(usableKeys('openrouter', keys, 'm', now + 1_000)).toEqual([]);
    expect(isCoolingDown(modelScope('openrouter', 'm'), now + 6_000)).toBe(false);
    expect(usableKeys('openrouter', keys, 'm', now + 6_000)).toHaveLength(3);
  });
});
