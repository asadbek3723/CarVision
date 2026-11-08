import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Adapter, AttemptResult, ChainInput } from './image-adapters';
import { runImageChain } from './image-chain';
import { parseModelPrefs, planModels, prioritizeModels, rankOpenRouterModel, STATIC_IMAGE_MODELS, type ImageModelSpec } from './image-models';
import { resetCooldowns, type ProviderId } from './key-pool';

const input: ChainInput = {
  carDataUri: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  partDataUris: [],
  referenceDataUri: null,
  prompt: 'p',
  mode: 'fitment',
};

const spec = (provider: ProviderId, model: string, rank: number, supportsEdit = true): ImageModelSpec => ({
  provider,
  model,
  supportsEdit,
  rank,
});

const ok = (image: string): AttemptResult => ({ ok: true, image });
const fail = (kind: AttemptResult extends infer R ? (R extends { ok: false; kind: infer K } ? K : never) : never): AttemptResult => ({
  ok: false,
  kind,
});

beforeEach(() => resetCooldowns());

describe('planModels / ranking', () => {
  it('orders strongest first, sinks text-only models and drops unconfigured providers', () => {
    const plan = planModels(
      [
        spec('openai', 'gpt-image-1', 12, false),
        spec('fal', 'fal-ai/flux-pro/kontext', 41),
        spec('gemini', 'gemini-2.5-flash-image', 14),
        spec('openrouter', 'a/seedream-4', 20),
        spec('openrouter', 'a/text-only', 30, false),
      ],
      new Set<ProviderId>(['gemini', 'openrouter', 'openai']),
      true
    );
    expect(plan.map((m) => m.model)).toEqual(['gemini-2.5-flash-image', 'a/seedream-4', 'gpt-image-1', 'a/text-only']);
  });

  it('ranks known OpenRouter families by quality', () => {
    const r = rankOpenRouterModel;
    expect(r('google/gemini-3-pro-image')).toBeLessThan(r('openai/gpt-image-2.5-flare'));
    expect(r('openai/gpt-image-2.5-flare')).toBeLessThan(r('bytedance-seed/seedream-5-0-flash'));
    expect(r('bytedance-seed/seedream-5-0-flash')).toBeLessThan(r('tencent/hy-image-v3.5-preview'));
    expect(r('tencent/hy-image-v3.5-preview')).toBeLessThan(r('meta/muse-image'));
    expect(r('meta/muse-image')).toBeLessThan(r('black-forest-labs/flux-3-image-klein'));
    expect(r('black-forest-labs/flux-3-image-klein')).toBeLessThan(r('some/unknown'));
  });
});

describe('per-task model preferences', () => {
  it('parses provider:model lists and ignores junk', () => {
    expect(parseModelPrefs('gemini:gemini-3.1-flash-image, openrouter:openai/gpt-image-2 ,bogus:x,nocolon,fal:')).toEqual([
      { provider: 'gemini', model: 'gemini-3.1-flash-image' },
      { provider: 'openrouter', model: 'openai/gpt-image-2' },
    ]);
    expect(parseModelPrefs(undefined)).toEqual([]);
  });

  it('puts preferred models first, adds unknown ones and keeps the rest as fallback', () => {
    const configured = new Set<ProviderId>(['gemini', 'openrouter']);
    const plan = planModels(
      [spec('gemini', 'g-a', 5), spec('gemini', 'g-b', 6), spec('openrouter', 'or-a', 7)],
      configured,
      true
    );
    const out = prioritizeModels(
      plan,
      [
        { provider: 'openrouter', model: 'or-new' },
        { provider: 'gemini', model: 'g-b' },
        { provider: 'fal', model: 'not-configured' },
      ],
      configured
    );
    expect(out.map((m) => m.model)).toEqual(['or-new', 'g-b', 'g-a', 'or-a']);
    expect(out[0]).toMatchObject({ supportsEdit: true });
  });

  it('tries Nano Banana 2 before Pro by default', () => {
    const plan = planModels(STATIC_IMAGE_MODELS, new Set<ProviderId>(['gemini']), true);
    expect(plan[0]!.model).toBe('gemini-3.1-flash-image');
    expect(plan[1]!.model).toBe('gemini-3-pro-image-preview');
  });

  it('runImageChain honours prefs', async () => {
    resetCooldowns();
    const adapter = vi.fn<Adapter>().mockResolvedValue(ok('x'));
    const res = await runImageChain(input, {
      keysFor: (p) => (p === 'gemini' ? ['gem-key-aaaa'] : []),
      models: [spec('gemini', 'g1', 1), spec('gemini', 'g2', 2)],
      prefs: [{ provider: 'gemini', model: 'g2' }],
      adapters: { gemini: adapter },
    });
    expect(res).toMatchObject({ ok: true, model: 'g2' });
  });
});

describe('runImageChain', () => {
  const models = [spec('gemini', 'g1', 1), spec('openrouter', 'or1', 2), spec('fal', 'f1', 3)];
  const keysFor = (p: ProviderId) =>
    ({ gemini: ['gem-key-aaaa'], openrouter: ['or-key-aaaaa', 'or-key-bbbbb'], fal: ['fal-key-aaaa'] })[p as string] ?? [];

  it('reports no_provider without keys', async () => {
    const res = await runImageChain(input, { keysFor: () => [], models });
    expect(res).toMatchObject({ ok: false, reason: 'no_provider' });
  });

  it('uses the strongest model first', async () => {
    const gemini = vi.fn<Adapter>().mockResolvedValue(ok('img-g'));
    const res = await runImageChain(input, { keysFor, models, adapters: { gemini } });
    expect(res).toMatchObject({ ok: true, image: 'img-g', provider: 'gemini', model: 'g1' });
  });

  it('rotates to the next key on 429, then the next model once all keys are limited', async () => {
    const gemini = vi.fn<Adapter>().mockResolvedValue(fail('rate_limit'));
    const openrouter = vi
      .fn<Adapter>()
      .mockResolvedValueOnce(fail('rate_limit'))
      .mockResolvedValueOnce(ok('img-or'));
    const res = await runImageChain(input, { keysFor, models, adapters: { gemini, openrouter } });
    expect(res).toMatchObject({ ok: true, image: 'img-or', provider: 'openrouter' });
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(openrouter.mock.calls.map((c) => c[1])).toEqual(['or-key-aaaaa', 'or-key-bbbbb']);
  });

  it('remembers cooldowns: a limited key is not retried on the next request', async () => {
    const gemini = vi.fn<Adapter>().mockResolvedValue(fail('rate_limit'));
    const openrouter = vi.fn<Adapter>().mockResolvedValue(ok('x'));
    await runImageChain(input, { keysFor, models, adapters: { gemini, openrouter } });
    await runImageChain(input, { keysFor, models, adapters: { gemini, openrouter } });
    expect(gemini).toHaveBeenCalledTimes(1);
  });

  it('parks a model that does not exist (404) for every key', async () => {
    const openrouter = vi.fn<Adapter>().mockResolvedValue(fail('not_found'));
    const gemini = vi.fn<Adapter>().mockResolvedValue(fail('not_found'));
    const fal = vi.fn<Adapter>().mockResolvedValue(ok('img-f'));
    const res = await runImageChain(input, { keysFor, models, adapters: { gemini, openrouter, fal } });
    expect(res).toMatchObject({ ok: true, provider: 'fal' });
    expect(openrouter).toHaveBeenCalledTimes(1);
  });

  it('returns busy when everything is limited, failed when a model really failed', async () => {
    const limited = vi.fn<Adapter>().mockResolvedValue(fail('rate_limit'));
    const busy = await runImageChain(input, {
      keysFor,
      models,
      adapters: { gemini: limited, openrouter: limited, fal: limited },
    });
    expect(busy).toMatchObject({ ok: false, reason: 'busy' });

    resetCooldowns();
    const broken = vi.fn<Adapter>().mockResolvedValue(fail('bad_request'));
    const failed = await runImageChain(input, {
      keysFor,
      models,
      adapters: { gemini: broken, openrouter: limited, fal: limited },
    });
    expect(failed).toMatchObject({ ok: false, reason: 'failed' });
  });

  it('stops when the deadline is spent', async () => {
    let t = 0;
    const slow = vi.fn<Adapter>().mockImplementation(async () => {
      t += 48_000;
      return fail('timeout');
    });
    const res = await runImageChain(input, {
      keysFor,
      models,
      deadlineMs: 50_000,
      now: () => t,
      adapters: { gemini: slow, openrouter: slow, fal: slow },
    });
    expect(res.ok).toBe(false);
    expect(slow).toHaveBeenCalledTimes(1);
  });
});
