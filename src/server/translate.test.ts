import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translateListing } from './translate';

const geminiReply = (obj: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });

describe('translateListing', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key-123456');
    vi.stubEnv('OPENAI_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns translations for the other languages and drops the detected one and empty names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        geminiReply({
          sourceLang: 'uz',
          translations: {
            uz: { name: 'must be ignored', description: '' },
            ru: { name: 'Диски BBS CI-R 20', description: 'Новые' },
            en: { name: '', description: 'x' },
          },
        })
      )
    );
    const r = await translateListing({ name: 'Disklar BBS CI-R 20', description: 'Yangi' });
    expect(r?.sourceLang).toBe('uz');
    expect(r?.translations.ru).toEqual({ name: 'Диски BBS CI-R 20', description: 'Новые' });
    expect(r?.translations.uz).toBeUndefined();
    expect(r?.translations.en).toBeUndefined();
  });

  it('returns null on invalid model output', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }), { status: 200 })));
    expect(await translateListing({ name: 'A', description: '' })).toBeNull();
  });

  it('returns null without any AI key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn());
    expect(await translateListing({ name: 'A', description: '' })).toBeNull();
  });

  it('does not retry a permanent error', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await translateListing({ name: 'A', description: '' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('translateListing polish', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key-123456');
    vi.stubEnv('OPENAI_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const reply = (polished: { name: string; description: string }) =>
    vi.fn(async () => geminiReply({ sourceLang: 'uz', polished, translations: { ru: { name: 'Диски', description: '' } } }));

  it('keeps a light proofread of the original', async () => {
    vi.stubGlobal('fetch', reply({ name: 'Disklar BBS R19', description: 'Yangi, 4 dona.' }));
    const r = await translateListing({ name: 'disklar bbs R19', description: 'yangi 4 dona' });
    expect(r?.polished).toEqual({ name: 'Disklar BBS R19', description: 'Yangi, 4 dona.' });
  });

  it('rejects a rewrite that expands or invents text', async () => {
    vi.stubGlobal('fetch', reply({ name: 'Disklar BBS R19', description: 'Yangi, 4 dona. Yuqori sifatli alyuminiy, kafolat bilan!' }));
    const r = await translateListing({ name: 'disklar bbs R19', description: 'yangi 4 dona' });
    expect(r?.polished).toBeNull();
    expect(r?.translations.ru?.name).toBe('Диски');
  });

  it('never fills an empty description', async () => {
    vi.stubGlobal('fetch', reply({ name: 'Disklar', description: 'Yangi disklar.' }));
    const r = await translateListing({ name: 'disklar', description: '' });
    expect(r?.polished).toBeNull();
  });
});
