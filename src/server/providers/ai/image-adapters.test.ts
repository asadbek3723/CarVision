import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGeminiParts, extractGeminiImage, geminiAdapter, geminiImageSize, type ChainInput } from './image-adapters';
import type { ImageModelSpec } from './image-models';

const bigB64 = 'A'.repeat(1500);
const png169 = () => {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(1920, 16);
  b.writeUInt32BE(1080, 20);
  return `data:image/png;base64,${b.toString('base64')}`;
};

const input = (over: Partial<ChainInput> = {}): ChainInput => ({
  carDataUri: png169(),
  partDataUris: [],
  referenceDataUri: null,
  prompt: 'EDIT PROMPT',
  mode: 'fitment',
  ...over,
});

const spec = (model: string): ImageModelSpec => ({ provider: 'gemini', model, supportsEdit: true, rank: 1 });

describe('extractGeminiImage', () => {
  it('returns the picture of a normal answer', () => {
    const res = extractGeminiImage({ candidates: [{ content: { parts: [{ text: 'here' }, { inlineData: { mimeType: 'image/png', data: bigB64 } }] } }] });
    expect(res).toEqual({ ok: true, image: `data:image/png;base64,${bigB64}` });
  });

  it('skips interim "thought" drafts and takes the last real image', () => {
    const res = extractGeminiImage({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, inlineData: { mimeType: 'image/png', data: 'D'.repeat(1500) } },
              { inlineData: { mimeType: 'image/jpeg', data: 'F'.repeat(1500) } },
            ],
          },
        },
      ],
    });
    expect(res).toEqual({ ok: true, image: `data:image/jpeg;base64,${'F'.repeat(1500)}` });
  });

  it('accepts snake_case parts and ignores tiny fragments', () => {
    expect(extractGeminiImage({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/webp', data: bigB64 } }] } }] })).toMatchObject({ ok: true });
    expect(extractGeminiImage({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }] })).toMatchObject({ ok: false, kind: 'empty' });
  });

  it('tells a safety refusal from an empty answer', () => {
    expect(extractGeminiImage({ candidates: [{ finishReason: 'IMAGE_SAFETY' }] })).toEqual({ ok: false, kind: 'blocked' });
    expect(extractGeminiImage({ candidates: [], promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } })).toEqual({ ok: false, kind: 'blocked' });
    expect(extractGeminiImage({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'sorry' }] } }] })).toEqual({ ok: false, kind: 'empty' });
    expect(extractGeminiImage({})).toEqual({ ok: false, kind: 'empty' });
  });

  it('never trusts an unknown mime type', () => {
    const res = extractGeminiImage({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'text/html', data: bigB64 } }] } }] });
    expect(res).toMatchObject({ ok: true });
    expect((res as { image: string }).image.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('buildGeminiParts', () => {
  it('labels the car, every part photo and the reference so the model cannot mix them up', () => {
    const parts = buildGeminiParts(
      input({
        partDataUris: [png169(), png169()],
        partLabels: ['BBS CI-R (Wheels)', 'Carbon lip (Body Kit)'],
        referenceDataUri: png169(),
      })
    );
    const texts = parts.filter((p) => 'text' in p).map((p) => p['text'] as string);
    expect(texts[0]).toBe('EDIT PROMPT');
    expect(texts[1]).toMatch(/^IMAGE 1: .*car photo/);
    expect(texts[2]).toContain('IMAGE 2');
    expect(texts[2]).toContain('BBS CI-R (Wheels)');
    expect(texts[3]).toContain('IMAGE 3');
    expect(texts[3]).toContain('Carbon lip (Body Kit)');
    expect(texts[4]).toContain('IMAGE 4');
    expect(parts.filter((p) => 'inlineData' in p)).toHaveLength(4);
  });

  it('uses at most three part photos', () => {
    const parts = buildGeminiParts(input({ partDataUris: [png169(), png169(), png169(), png169()] }));
    expect(parts.filter((p) => 'inlineData' in p)).toHaveLength(4); // car + 3 parts
  });
});

describe('geminiImageSize', () => {
  it('defaults to 2K and only accepts valid sizes', () => {
    expect(geminiImageSize('fitment', {} as NodeJS.ProcessEnv)).toBe('2K');
    expect(geminiImageSize('fitment', { IMAGE_SIZE_FITMENT: '1k' } as unknown as NodeJS.ProcessEnv)).toBe('1K');
    expect(geminiImageSize('fitment', { IMAGE_SIZE_FITMENT: '9K' } as unknown as NodeJS.ProcessEnv)).toBe('2K');
    expect(geminiImageSize('enhance_for_video', { IMAGE_SIZE_VIDEO_FRAME: '4K' } as unknown as NodeJS.ProcessEnv)).toBe('4K');
  });
});

describe('geminiAdapter request', () => {
  const okBody = { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: bigB64 } }] } }] };
  let calls: Array<{ url: string; body: Record<string, unknown> }>;

  beforeEach(() => {
    calls = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (responses: Array<{ status: number; json?: unknown }>) => {
    let i = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: { body: string }) => {
        calls.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
        const r = responses[Math.min(i++, responses.length - 1)]!;
        return new Response(JSON.stringify(r.json ?? {}), { status: r.status });
      })
    );
  };
  const config = (n: number) => (calls[n]!.body['generationConfig'] as { imageConfig?: Record<string, string>; responseModalities: string[] });

  it('asks for the photo\'s own aspect ratio and a 2K picture on Gemini 3 models', async () => {
    stubFetch([{ status: 200, json: okBody }]);
    const res = await geminiAdapter(spec('gemini-3.1-flash-image'), 'AIzaSyKeyKeyKeyKey', input(), 30_000);
    expect(res).toMatchObject({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain('generativelanguage.googleapis.com');
    expect(config(0).imageConfig).toEqual({ aspectRatio: '16:9', imageSize: '2K' });
    expect(config(0).responseModalities).toEqual(['TEXT', 'IMAGE']);
  });

  it('sends Vertex keys to the Vertex endpoint', async () => {
    stubFetch([{ status: 200, json: okBody }]);
    await geminiAdapter(spec('gemini-3.1-flash-image'), 'AQ.VertexKeyVertexKey', input(), 30_000);
    expect(calls[0]!.url).toContain('aiplatform.googleapis.com');
  });

  it('does not send imageSize to gemini-2.5-flash-image (it rejects it)', async () => {
    stubFetch([{ status: 200, json: okBody }]);
    await geminiAdapter(spec('gemini-2.5-flash-image'), 'AIzaSyKeyKeyKeyKey', input(), 30_000);
    expect(config(0).imageConfig).toEqual({ aspectRatio: '16:9' });
  });

  it('retries with fewer fields when the API rejects the image config (400 costs nothing)', async () => {
    stubFetch([{ status: 400 }, { status: 400 }, { status: 200, json: okBody }]);
    const res = await geminiAdapter(spec('gemini-3.1-flash-image'), 'AIzaSyKeyKeyKeyKey', input(), 30_000);
    expect(res).toMatchObject({ ok: true });
    expect(calls).toHaveLength(3);
    expect(config(0).imageConfig).toEqual({ aspectRatio: '16:9', imageSize: '2K' });
    expect(config(1).imageConfig).toEqual({ aspectRatio: '16:9' });
    expect(config(2).imageConfig).toBeUndefined();
  });

  it('does not retry on a rate limit and reports it', async () => {
    stubFetch([{ status: 429, json: { error: { message: 'slow down' } } }]);
    const res = await geminiAdapter(spec('gemini-3.1-flash-image'), 'AIzaSyKeyKeyKeyKey', input(), 30_000);
    expect(res).toMatchObject({ ok: false, kind: 'rate_limit' });
    expect(calls).toHaveLength(1);
  });

  it('reports a refusal as blocked', async () => {
    stubFetch([{ status: 200, json: { candidates: [{ finishReason: 'IMAGE_SAFETY' }] } }]);
    const res = await geminiAdapter(spec('gemini-3.1-flash-image'), 'AIzaSyKeyKeyKeyKey', input(), 30_000);
    expect(res).toEqual({ ok: false, kind: 'blocked' });
  });
});
