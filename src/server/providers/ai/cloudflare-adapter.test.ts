import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCloudflarePrompt,
  cloudflareAdapter,
  cloudflareLongEdge,
  cloudflareOutputSize,
  refineCloudflareFail,
  type ChainInput,
} from './image-adapters';
import { cloudflareKeys, envKeys, splitCloudflareKey } from './key-pool';
import { STATIC_IMAGE_MODELS, parseModelPrefs, planModels } from './image-models';
import type { ImageModelSpec } from './image-models';

const ACCOUNT = '0123456789abcdef0123456789abcdef';
const KEY = `${ACCOUNT}:cf-token-123456789`;
const spec: ImageModelSpec = { provider: 'cloudflare', model: '@cf/black-forest-labs/flux-2-dev', supportsEdit: true, rank: 13 };

/** Minimal valid JPEG header of the given size (SOF0 frame), enough for readImageDims. */
const jpeg = (width: number, height: number) => {
  const b = Buffer.alloc(40);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
  b.writeUInt16BE(height, 7);
  b.writeUInt16BE(width, 9);
  return `data:image/jpeg;base64,${b.toString('base64')}`;
};
/** A real-looking JPEG answer (FLUX.2 returns base64 JPEG). */
const jpegAnswer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1200, 1)]).toString('base64');

const input = (over: Partial<ChainInput> = {}): ChainInput => ({
  carDataUri: jpeg(1920, 1080),
  partDataUris: [],
  referenceDataUri: null,
  prompt: 'EDIT PROMPT',
  mode: 'fitment',
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('cloudflare keys', () => {
  it('pairs bare tokens with CLOUDFLARE_ACCOUNT_ID and accepts accountId:token entries', () => {
    const other = 'ffffffffffffffffffffffffffffffff';
    expect(
      cloudflareKeys({ CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: 'tok-aaaaaaaa', CLOUDFLARE_API_TOKENS: `${other}:tok-bbbbbbbb` } as never)
    ).toEqual([`${other}:tok-bbbbbbbb`, `${ACCOUNT}:tok-aaaaaaaa`]);
  });

  it('drops a token without a valid account id, so live mode is not switched on half-configured', () => {
    expect(cloudflareKeys({ CLOUDFLARE_API_TOKEN: 'tok-aaaaaaaa' } as never)).toEqual([]);
    expect(cloudflareKeys({ CLOUDFLARE_ACCOUNT_ID: 'not-an-id', CLOUDFLARE_API_TOKEN: 'tok-aaaaaaaa' } as never)).toEqual([]);
    expect(envKeys('cloudflare', {} as never)).toEqual([]);
  });

  it('splits a pooled key back into account and token', () => {
    expect(splitCloudflareKey(KEY)).toEqual({ accountId: ACCOUNT, token: 'cf-token-123456789' });
    expect(splitCloudflareKey('no-colon')).toBeNull();
  });
});

describe('cloudflare model plan', () => {
  it('ranks FLUX.2 [dev] as an image editor once the provider has a key', () => {
    const plan = planModels(STATIC_IMAGE_MODELS, new Set(['cloudflare']), true);
    expect(plan.map((m) => m.model)).toEqual(['@cf/black-forest-labs/flux-2-dev']);
    expect(parseModelPrefs('cloudflare:@cf/black-forest-labs/flux-2-dev')).toEqual([
      { provider: 'cloudflare', model: '@cf/black-forest-labs/flux-2-dev' },
    ]);
  });
});

describe('cloudflareOutputSize', () => {
  it('keeps the photo aspect ratio in multiples of 16', () => {
    expect(cloudflareOutputSize({ width: 1920, height: 1080 }, 1536)).toEqual({ width: 1536, height: 864 });
    expect(cloudflareOutputSize({ width: 3024, height: 4032 }, 1536)).toEqual({ width: 1152, height: 1536 });
    expect(cloudflareOutputSize(null, 1024)).toEqual({ width: 1024, height: 768 });
  });

  it('clamps extreme shapes and the configured size', () => {
    const s = cloudflareOutputSize({ width: 10_000, height: 100 }, 1536);
    expect(s.width / s.height).toBeLessThanOrEqual(3.1);
    expect(cloudflareLongEdge({ CLOUDFLARE_IMAGE_SIZE: '99999' } as never)).toBe(2048);
    expect(cloudflareLongEdge({ CLOUDFLARE_IMAGE_SIZE: 'abc' } as never)).toBe(1536);
    expect(cloudflareLongEdge({ CLOUDFLARE_IMAGE_SIZE: '1000' } as never)).toBe(1008);
  });
});

describe('buildCloudflarePrompt', () => {
  it('says which input image is the car, which are parts and which is the reference', () => {
    const p = buildCloudflarePrompt(input({ partLabels: ['BBS wheels (Wheels)'] }), 1, true);
    expect(p).toMatch(/^Image 1 is the customer's real car photo/);
    expect(p).toContain('Image 2 is a part photo of the BBS wheels (Wheels)');
    expect(p).toContain('Image 3 is the same car already finished');
    expect(p.endsWith('EDIT PROMPT')).toBe(true);
  });
});

describe('refineCloudflareFail', () => {
  it('turns Workers AI error codes into the right failure kind', () => {
    expect(refineCloudflareFail(400, '{"errors":[{"message":"Your output has been flagged","code":3030}]}', 'bad_request')).toBe('blocked');
    expect(refineCloudflareFail(429, '{"errors":[{"message":"you have used up your daily free allocation of 10,000 neurons","code":4006}]}', 'rate_limit')).toBe('quota');
    expect(refineCloudflareFail(429, '{"errors":[{"message":"Capacity temporarily exceeded","code":3040}]}', 'rate_limit')).toBe('rate_limit');
    expect(refineCloudflareFail(400, '{"errors":[{"code":10000,"message":"Authentication error"}]}', 'bad_request')).toBe('auth');
    expect(refineCloudflareFail(400, '{"errors":[{"code":5006,"message":"Bad input"}]}', 'bad_request')).toBe('bad_request');
  });
});

describe('cloudflareAdapter request', () => {
  it('sends a multipart form with the car first, parts next, the reference last and the matching size', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ success: true, result: { image: jpegAnswer } }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await cloudflareAdapter(
      spec,
      KEY,
      input({ partDataUris: [jpeg(400, 400), jpeg(300, 300)], partLabels: ['Wheel', 'Spoiler'], referenceDataUri: jpeg(1920, 1080) }),
      30_000
    );
    expect(res).toEqual({ ok: true, image: `data:image/jpeg;base64,${jpegAnswer}` });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/black-forest-labs/flux-2-dev`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer cf-token-123456789');
    // FormData sets its own multipart boundary: a JSON content type would break the upload.
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    const form = init.body as FormData;
    expect(form.get('width')).toBe('1536');
    expect(form.get('height')).toBe('864');
    expect(['input_image_0', 'input_image_1', 'input_image_2', 'input_image_3'].map((k) => (form.get(k) as File | null)?.name)).toEqual([
      'car.jpg',
      'part-1.jpg',
      'part-2.jpg',
      'reference.jpg',
    ]);
    expect(String(form.get('prompt'))).toContain('Image 4 is the same car already finished');
  });

  it('never sends more than 4 input images: every part photo first, the reference only if a slot is left', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result: { image: jpegAnswer } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await cloudflareAdapter(spec, KEY, input({ partDataUris: [jpeg(1, 1), jpeg(1, 1), jpeg(1, 1)], referenceDataUri: jpeg(1, 1) }), 30_000);
    const form = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get('input_image_4')).toBeNull();
    expect((form.get('input_image_3') as File).name).toBe('part-3.jpg');
  });

  it('refuses (free) instead of rendering a part it cannot see', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const webp = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const out = await cloudflareAdapter(spec, KEY, input({ partDataUris: [webp] }), 30_000);
    expect(out).toEqual({ ok: false, kind: 'bad_request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a used-up daily allocation as quota and a flagged output as blocked', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"errors":[{"message":"daily free allocation of 10,000 neurons","code":4006}]}', { status: 429 })));
    expect(await cloudflareAdapter(spec, KEY, input(), 30_000)).toMatchObject({ ok: false, kind: 'quota' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"errors":[{"message":"Your output has been flagged","code":3030}]}', { status: 400 })));
    expect(await cloudflareAdapter(spec, KEY, input(), 30_000)).toMatchObject({ ok: false, kind: 'blocked' });
  });

  it('rejects an answer that is not an image and a malformed key without calling out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ result: { image: Buffer.alloc(1500, 65).toString('base64') } }), { status: 200 })));
    expect(await cloudflareAdapter(spec, KEY, input(), 30_000)).toEqual({ ok: false, kind: 'empty' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await cloudflareAdapter(spec, 'bare-token-only', input(), 30_000)).toEqual({ ok: false, kind: 'auth' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
