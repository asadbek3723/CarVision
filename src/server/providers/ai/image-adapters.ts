import type { ImageModelSpec } from './image-models';
import { splitCloudflareKey, type ProviderId } from './key-pool';
import { geminiGenerateUrls } from './google-endpoint';
import { dataUriBytes, nearestAspectRatio, readImageDims, sniffImage } from './image-info';

export type FailKind =
  | 'rate_limit' // 429: this key is exhausted for this model right now
  | 'quota' // 402: key out of credit
  | 'auth' // 401/403: key rejected
  | 'not_found' // 404: model unavailable
  | 'bad_request' // 400/422: model refused this input (would fail on every key)
  | 'server' // 5xx / network
  | 'timeout'
  | 'blocked' // the model refused the content (safety filter): retrying the same photo will not help
  | 'empty'; // 200 but no image in the answer

export type AttemptResult =
  | { ok: true; image: string }
  | { ok: false; kind: FailKind; retryAfterMs?: number };

export interface ChainInput {
  carDataUri: string;
  partDataUris: string[];
  /** One short name per entry of `partDataUris` (same order), used to label the reference photos. */
  partLabels?: string[] | undefined;
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

/**
 * Turns a provider's own error text into a sharper failure kind than the HTTP status alone gives
 * (for example a 400 that is really a safety refusal). Returns undefined to keep the status kind.
 */
type RefineFail = (status: number, detail: string, kind: FailKind) => FailKind | undefined;

/** POST with timeout. Turns transport errors into typed failures and non-2xx into classified ones. */
async function send(
  url: string,
  headers: Record<string, string>,
  body: BodyInit,
  timeoutMs: number,
  refine?: RefineFail
): Promise<HttpOutcome> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
      const detail = (await res.text().catch(() => '')).slice(0, 2000);
      let kind = classifyStatus(res.status);
      // A 429 that says the key has no allowance at all (free tier "limit: 0", no billing, no
      // credits) will never clear by waiting: treat it as out of quota, not as "busy".
      if (kind === 'rate_limit' && QUOTA_HINT.test(detail)) kind = 'quota';
      kind = refine?.(res.status, detail, kind) ?? kind;
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

/** JSON POST (every provider except Cloudflare's multipart image models). */
function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<HttpOutcome> {
  return send(url, { 'Content-Type': 'application/json', ...headers }, JSON.stringify(body), timeoutMs);
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

/** Image sizes the Gemini 3 image models accept (uppercase K is required). */
const IMAGE_SIZES = new Set(['1K', '2K', '4K']);

/** Output size for a call: IMAGE_SIZE_FITMENT / IMAGE_SIZE_VIDEO_FRAME, default 2K (sharper than the 1K default). */
export function geminiImageSize(mode: ChainInput['mode'], env: NodeJS.ProcessEnv = process.env): string {
  const raw = (mode === 'enhance_for_video' ? env['IMAGE_SIZE_VIDEO_FRAME'] : env['IMAGE_SIZE_FITMENT'])?.trim().toUpperCase();
  return raw && IMAGE_SIZES.has(raw) ? raw : '2K';
}

/** `imageSize` exists only on the Gemini 3 / Nano Banana 2+ models; gemini-2.5-flash-image rejects it. */
const supportsImageSize = (model: string) => /gemini-3|nano-banana/.test(model);

const BLOCK_REASONS = new Set([
  'SAFETY',
  'IMAGE_SAFETY',
  'PROHIBITED_CONTENT',
  'IMAGE_PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
  'RECITATION',
  'IMAGE_RECITATION',
]);

interface GeminiPart {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}
interface GeminiResponse {
  candidates?: Array<{ finishReason?: string; content?: { parts?: GeminiPart[] } }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Picks the finished picture out of a generateContent answer. Gemini 3 image models may add
 * interim "thought" images (drafts); those are skipped and the LAST real image wins. A refusal
 * (safety filter) is reported as `blocked`, any other answer without a picture as `empty`.
 */
export function extractGeminiImage(data: GeminiResponse): AttemptResult {
  const candidate = data.candidates?.[0];
  let image: string | null = null;
  for (const part of candidate?.content?.parts ?? []) {
    if (part.thought) continue;
    const mime = part.inlineData?.mimeType ?? part.inline_data?.mime_type;
    const b64 = part.inlineData?.data ?? part.inline_data?.data;
    if (!b64 || b64.length < 1000) continue;
    const type = mime && /^image\/(png|jpeg|webp)$/.test(mime) ? mime : 'image/png';
    image = `data:${type};base64,${b64}`;
  }
  if (image) return { ok: true, image };
  if (data.promptFeedback?.blockReason || BLOCK_REASONS.has(candidate?.finishReason ?? '')) {
    return { ok: false, kind: 'blocked' };
  }
  return EMPTY;
}

/**
 * The request: instruction first, then every picture with a short label saying what it is, so the
 * model never has to guess which reference photo belongs to which part.
 */
export function buildGeminiParts(input: ChainInput): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
  const add = (label: string, uri: string) => {
    const inline = parseDataUri(uri);
    if (!inline) return;
    parts.push({ text: label }, { inlineData: inline });
  };
  let n = 1;
  add(`IMAGE ${n++}: the customer's real car photo. This is the photo to edit; keep everything in it except the requested changes.`, input.carDataUri);
  input.partDataUris.slice(0, 3).forEach((uri, i) => {
    const name = input.partLabels?.[i]?.trim() || 'part';
    add(`IMAGE ${n++}: reference photo of the part "${name}". Reproduce exactly this part (shape, design, finish).`, uri);
  });
  if (input.referenceDataUri) {
    add(`IMAGE ${n++}: the same car already finished from another angle. Reference only for how the new parts and paint look; never copy its angle or background.`, input.referenceDataUri);
  }
  return parts;
}

export const geminiAdapter: Adapter = async (spec, key, input, timeoutMs) => {
  const parts = buildGeminiParts(input);

  // Same framing as the customer's photo: the before/after slider and the video overlay them.
  const bytes = dataUriBytes(input.carDataUri);
  const dims = bytes ? readImageDims(bytes) : null;
  const aspectRatio = dims ? nearestAspectRatio(dims.width, dims.height) : undefined;
  const imageSize = supportsImageSize(spec.model) ? geminiImageSize(input.mode) : undefined;

  // Preferred config first; if the API rejects a field (400), retry with less (a 400 costs nothing).
  const configs: Array<Record<string, string> | undefined> = [];
  if (aspectRatio || imageSize) configs.push({ ...(aspectRatio ? { aspectRatio } : {}), ...(imageSize ? { imageSize } : {}) });
  if (aspectRatio && imageSize) configs.push({ aspectRatio });
  configs.push(undefined);

  const started = Date.now();
  let out: HttpOutcome = { fail: { ok: false, kind: 'auth' } };
  for (const imageConfig of configs) {
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], ...(imageConfig ? { imageConfig } : {}) },
    };
    out = { fail: { ok: false, kind: 'auth' } };
    // AI Studio keys and Vertex AI keys live on different APIs: try the matching one first, and the
    // other only when this one rejects the key itself.
    for (const url of geminiGenerateUrls(key, spec.model)) {
      const left = timeoutMs - (Date.now() - started);
      if (left < 2_000) break;
      out = await post(url, { 'x-goog-api-key': key }, body, left);
      if (!('fail' in out) || out.fail.kind !== 'auth') break;
    }
    if (!('fail' in out) || out.fail.kind !== 'bad_request') break;
  }
  if ('fail' in out) return out.fail;
  try {
    return extractGeminiImage((await out.res.json()) as GeminiResponse);
  } catch {
    return EMPTY;
  }
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

// ---------------------------------------------------------------------------------------------
// Cloudflare Workers AI (FLUX.2 [dev])
// ---------------------------------------------------------------------------------------------

/** FLUX.2 on Workers AI takes at most 4 input images (`input_image_0` .. `input_image_3`). */
const CF_MAX_INPUT_IMAGES = 4;
/** Output size bounds: below 256 px the model refuses, above ~2 MP a render no longer fits the 44s budget. */
const CF_MIN_EDGE = 256;
const CF_MAX_EDGE = 2048;
/** 1536 px long edge renders in ~18-22s and is sharp on a phone and on desktop. */
const CF_DEFAULT_EDGE = 1536;

/** Long edge of the Cloudflare output (CLOUDFLARE_IMAGE_SIZE, 512-2048, default 1536). */
export function cloudflareLongEdge(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number((env['CLOUDFLARE_IMAGE_SIZE'] ?? '').trim());
  if (!Number.isFinite(raw) || raw <= 0) return CF_DEFAULT_EDGE;
  return Math.min(CF_MAX_EDGE, Math.max(512, Math.round(raw / 16) * 16));
}

/**
 * Output width/height with the same aspect ratio as the customer's photo (multiples of 16, as the
 * model needs), so the before/after slider overlays both pictures exactly.
 */
export function cloudflareOutputSize(dims: { width: number; height: number } | null, longEdge: number): { width: number; height: number } {
  const ratio = dims && dims.width > 0 && dims.height > 0 ? dims.width / dims.height : 4 / 3;
  // Extreme panoramas / slivers are clamped: the model cannot render them anyway.
  const r = Math.min(3, Math.max(1 / 3, ratio));
  const round16 = (v: number) => Math.min(CF_MAX_EDGE, Math.max(CF_MIN_EDGE, Math.round(v / 16) * 16));
  return r >= 1
    ? { width: round16(longEdge), height: round16(longEdge / r) }
    : { width: round16(longEdge * r), height: round16(longEdge) };
}

/**
 * FLUX.2 has no per-image captions like Gemini: the prompt itself says which input image is what,
 * so the model never takes a part photo for the car or copies the reference render's angle.
 */
export function buildCloudflarePrompt(input: ChainInput, partCount: number, hasReference: boolean): string {
  const lines: string[] = [
    "Image 1 is the customer's real car photo: it is the photo to edit. The output must keep its exact camera angle, framing, crop, background and lighting.",
  ];
  for (let i = 0; i < partCount; i += 1) {
    const name = input.partLabels?.[i]?.trim() || 'the part';
    lines.push(`Image ${i + 2} is a reference photo of ${name}: reproduce exactly this part (shape, design, finish) on the car of image 1.`);
  }
  if (hasReference) {
    lines.push(
      `Image ${partCount + 2} is the same car already finished from another angle: use it only as a reference for how the new parts and paint look; never copy its angle or background.`
    );
  }
  return `${lines.join(' ')}\n\n${input.prompt}`;
}

/** Workers AI error codes: 3030 = output flagged by the safety filter, 4006 / 3036 / "neurons" = daily free allocation used up (resets 00:00 UTC), 3040 = out of capacity. */
export const refineCloudflareFail: RefineFail = (status, detail, kind) => {
  if (/\b3030\b|flagged|nsfw/i.test(detail)) return 'blocked';
  if (/\b(3036|4006)\b|neurons|daily free allocation|allocation.*exceeded|account limit/i.test(detail)) return 'quota';
  if (/\b3040\b|capacity/i.test(detail)) return 'rate_limit';
  if (status === 400 && /\b10000\b|authentication error|invalid api token/i.test(detail)) return 'auth';
  if (/\b5007\b|no such model|model not found/i.test(detail)) return 'not_found';
  return kind;
};

/** Formats FLUX.2 on Workers AI is confirmed to read. A WebP part photo is left out rather than failing the whole render. */
const CF_INPUT_MIME = new Set(['image/jpeg', 'image/png']);

function dataUriToBlob(uri: string): Blob | null {
  const parsed = parseDataUri(uri);
  if (!parsed) return null;
  if (!CF_INPUT_MIME.has(parsed.mimeType.toLowerCase().replace('image/jpg', 'image/jpeg'))) return null;
  const bytes = Buffer.from(parsed.data, 'base64');
  return bytes.length > 0 ? new Blob([bytes], { type: parsed.mimeType }) : null;
}

/**
 * Cloudflare Workers AI REST API. The key is `accountId:token` (see `cloudflareKeys`). FLUX.2 takes
 * multipart form data: the prompt, up to 4 input images and the output size; it answers with
 * `{ result: { image: <base64 JPEG> } }`.
 */
export const cloudflareAdapter: Adapter = async (spec, key, input, timeoutMs) => {
  const creds = splitCloudflareKey(key);
  if (!creds) return { ok: false, kind: 'auth' };

  const car = dataUriToBlob(input.carDataUri);
  if (!car) return { ok: false, kind: 'bad_request' };

  // Car first, then as many part photos as fit, the finished other-angle render last.
  const reference = input.referenceDataUri ? dataUriToBlob(input.referenceDataUri) : null;
  const partSlots = CF_MAX_INPUT_IMAGES - 1 - (reference ? 1 : 0);
  const parts: Array<{ blob: Blob; label: string | undefined }> = [];
  input.partDataUris.slice(0, 3).forEach((uri, i) => {
    const blob = dataUriToBlob(uri);
    if (blob && parts.length < partSlots) parts.push({ blob, label: input.partLabels?.[i] });
  });

  const bytes = dataUriBytes(input.carDataUri);
  const size = cloudflareOutputSize(bytes ? readImageDims(bytes) : null, cloudflareLongEdge());

  const form = new FormData();
  form.append(
    'prompt',
    buildCloudflarePrompt({ ...input, partLabels: parts.map((p) => p.label ?? '') }, parts.length, Boolean(reference))
  );
  const ext = (b: Blob) => (b.type === 'image/png' ? 'png' : b.type === 'image/webp' ? 'webp' : 'jpg');
  form.append('input_image_0', car, `car.${ext(car)}`);
  parts.forEach((p, i) => form.append(`input_image_${i + 1}`, p.blob, `part-${i + 1}.${ext(p.blob)}`));
  if (reference) form.append(`input_image_${parts.length + 1}`, reference, `reference.${ext(reference)}`);
  form.append('width', String(size.width));
  form.append('height', String(size.height));

  const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${spec.model}`;
  const out = await send(url, { Authorization: `Bearer ${creds.token}` }, form, timeoutMs, refineCloudflareFail);
  if ('fail' in out) return out.fail;
  try {
    const data = (await out.res.json()) as { success?: boolean; result?: { image?: string } };
    const b64 = data.result?.image;
    if (!b64 || b64.length < 1000) return EMPTY;
    // The real format comes from the bytes (FLUX.2 answers JPEG today, but never trust a label).
    const type = sniffImage(Buffer.from(b64.slice(0, 64), 'base64'));
    return type ? { ok: true, image: `data:${type};base64,${b64}` } : EMPTY;
  } catch {
    return EMPTY;
  }
};

export const ADAPTERS: Record<ProviderId, Adapter> = {
  gemini: geminiAdapter,
  openrouter: openRouterAdapter,
  fal: falAdapter,
  openai: openAiAdapter,
  cloudflare: cloudflareAdapter,
};
