import type { ImageModelSpec } from './image-models';
import type { ProviderId } from './key-pool';
import { geminiGenerateUrls } from './google-endpoint';

export type FailKind =
  | 'rate_limit' // 429: this key is exhausted for this model right now
  | 'quota' // 402: key out of credit
  | 'auth' // 401/403: key rejected
  | 'not_found' // 404: model unavailable
  | 'bad_request' // 400/422: model refused this input (would fail on every key)
  | 'server' // 5xx / network
  | 'timeout'
  | 'empty'; // 200 but no image in the answer

export type AttemptResult =
  | { ok: true; image: string }
  | { ok: false; kind: FailKind; retryAfterMs?: number };

export interface ChainInput {
  carDataUri: string;
  partDataUris: string[];
  referenceDataUri: string | null;
  prompt: string;
  mode: 'fitment' | 'enhance_for_video';
}

export type Adapter = (
  spec: ImageModelSpec,
  key: string,
  input: ChainInput,
  timeoutMs: number
) => Promise<AttemptResult>;

export function classifyStatus(status: number): FailKind {
  if (status === 429) return 'rate_limit';
  if (status === 402) return 'quota';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'bad_request';
}

/** `Retry-After` in seconds or an HTTP date, as milliseconds (undefined when absent/invalid). */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

type HttpOutcome = { res: Response } | { fail: AttemptResult & { ok: false } };

const QUOTA_HINT = /limit:\s*0\b|free[_ ]tier|exceeded your current quota|billing|insufficient[_ ](credits|balance|quota)|payment required/i;

/** POST with timeout. Turns transport errors into typed failures and non-2xx into classified ones. */
async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number
): Promise<HttpOutcome> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
      const detail = (await res.text().catch(() => '')).slice(0, 2000);
      let kind = classifyStatus(res.status);
      // A 429 that says the key has no allowance at all (free tier "limit: 0", no billing, no
      // credits) will never clear by waiting: treat it as out of quota, not as "busy".
      if (kind === 'rate_limit' && QUOTA_HINT.test(detail)) kind = 'quota';
      // Operators need the provider's own reason in the logs (no keys or images are in it).
      console.warn(`image provider ${new URL(url).host} ${res.status} (${kind}):`, detail.replace(/\s+/g, ' ').slice(0, 300));
      return {
        fail: {
          ok: false,
          kind,
          ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        },
      };
    }
    return { res };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    return { fail: { ok: false, kind: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'server' } };
  }
}

const EMPTY: AttemptResult = { ok: false, kind: 'empty' };
const parseDataUri = (uri: string) => {
  const match = uri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  return match ? { mimeType: match[1] || 'image/jpeg', data: match[2] || '' } : null;
};

/** Car first, then up to 3 exact part photos, last = already finished render of the same build. */
function referenceImages(input: ChainInput): string[] {
  return [
    input.carDataUri,
    ...input.partDataUris.slice(0, 3),
    ...(input.referenceDataUri ? [input.referenceDataUri] : []),
  ];
}

const PART_NOTE =
  "The first image is the customer's car. Any following images are the exact tuning parts that must be installed onto the car with 100% identical visual details.";

export const geminiAdapter: Adapter = async (spec, key, input, timeoutMs) => {
  const parts: Array<Record<string, unknown>> = [{ text: `${input.prompt}\n${PART_NOTE}` }];
  for (const uri of referenceImages(input)) {
    const inline = parseDataUri(uri);
    if (inline) parts.push({ inlineData: inline });
  }
  const body = { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
  const started = Date.now();
  let out: HttpOutcome = { fail: { ok: false, kind: 'auth' } };
  // AI Studio keys and Vertex AI keys live on different APIs: try the matching one first, and the
  // other only when this one rejects the key itself.
  for (const url of geminiGenerateUrls(key, spec.model)) {
    const left = timeoutMs - (Date.now() - started);
    if (left < 2_000) break;
    out = await post(url, { 'x-goog-api-key': key }, body, left);
    if (!('fail' in out) || out.fail.kind !== 'auth') break;
  }
  if ('fail' in out) return out.fail;
  try {
    const data = (await out.res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
    };
    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return { ok: true, image: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}` };
      }
    }
  } catch {
    // fall through
  }
  return EMPTY;
};

/**
 * OpenRouter's dedicated Image API (`POST /api/v1/images`): GPT Image, Seedream, FLUX, Hunyuan, Muse,
 * Gemini image ... Reference images (car, parts) go in `input_references`; answer is base64 bytes.
 */
export const openRouterAdapter: Adapter = async (spec, key, input, timeoutMs) => {
  const body: Record<string, unknown> = {
    model: spec.model,
    prompt: spec.supportsEdit ? `${input.prompt}\n${PART_NOTE}` : input.prompt,
    n: 1,
  };
  if (spec.supportsEdit) {
    body.input_references = referenceImages(input).map((url) => ({ type: 'image_url', image_url: { url } }));
  }
  const out = await post(
    'https://openrouter.ai/api/v1/images',
    {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://carvision.app',
      'X-Title': 'CarVision',
    },
    body,
    timeoutMs
  );
  if ('fail' in out) return out.fail;
  try {
    const data = (await out.res.json()) as {
      data?: Array<{ b64_json?: string; media_type?: string; url?: string }>;
    };
    const first = data.data?.[0];
    if (first?.b64_json) {
      const type = first.media_type && /^image\/(png|jpeg|webp)$/.test(first.media_type) ? first.media_type : 'image/png';
      return { ok: true, image: `data:${type};base64,${first.b64_json}` };
    }
  } catch {
    // fall through
  }
  return EMPTY;
};

export const falAdapter: Adapter = async (spec, key, input, timeoutMs) => {
  const refs = referenceImages(input);
  const multi = input.mode === 'fitment' && (input.partDataUris.length > 0 || input.referenceDataUri);
  let body: Record<string, unknown>;
  if (spec.model === 'fal-ai/nano-banana/edit') {
    // Works with the car photo alone too (colour, polish, parts without a photo, video mastering).
    body = { prompt: input.prompt, image_urls: refs, num_images: 1, output_format: 'jpeg' };
  } else if (spec.model === 'fal-ai/flux-pro/kontext/multi') {
    if (!multi) return { ok: false, kind: 'bad_request' };
    body = { prompt: input.prompt, image_urls: refs, guidance_scale: 3.5, num_images: 1, output_format: 'jpeg' };
  } else {
    body = { prompt: input.prompt, image_url: input.carDataUri, guidance_scale: 3.5, num_images: 1, output_format: 'jpeg' };
  }
  const out = await post(`https://fal.run/${spec.model}`, { Authorization: `Key ${key}` }, body, timeoutMs);
  if ('fail' in out) return out.fail;
  try {
    const data = (await out.res.json()) as { images?: Array<{ url?: string }>; image?: { url?: string } };
    const url = data.images?.[0]?.url || data.image?.url;
    if (url) return { ok: true, image: url };
  } catch {
    // fall through
  }
  return EMPTY;
};

export const openAiAdapter: Adapter = async (spec, key, input, timeoutMs) => {
  const out = await post(
    'https://api.openai.com/v1/images/generations',
    { Authorization: `Bearer ${key}` },
    { model: spec.model, prompt: input.prompt, size: '1536x1024', quality: 'high' },
    timeoutMs
  );
  if ('fail' in out) return out.fail;
  try {
    const data = (await out.res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = data.data?.[0];
    if (first?.b64_json) return { ok: true, image: `data:image/png;base64,${first.b64_json}` };
    if (first?.url) return { ok: true, image: first.url };
  } catch {
    // fall through
  }
  return EMPTY;
};

export const ADAPTERS: Record<ProviderId, Adapter> = {
  gemini: geminiAdapter,
  openrouter: openRouterAdapter,
  fal: falAdapter,
  openai: openAiAdapter,
};
