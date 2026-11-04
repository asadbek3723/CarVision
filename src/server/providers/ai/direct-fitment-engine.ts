import fs from 'node:fs/promises';
import path from 'node:path';

export interface FitmentPartInput {
  id: string;
  name: string;
  category: string;
  spec?: string | undefined;
  image?: string | undefined;
  angleImage?: string | undefined;
  swatch?: string | undefined;
}

export interface DirectFitmentRequest {
  carPhoto: string;
  angleId?: string | undefined;
  parts: FitmentPartInput[];
  mode?: 'fitment' | 'enhance_for_video' | undefined;
  /**
   * An already-finished render of the SAME car from another angle. Used only as a reference so
   * paint, wheels and body parts look identical across all angles of one build.
   */
  referenceAfter?: string | undefined;
}

export interface DirectFitmentResponse {
  providerUsed: 'fal-ai' | 'gemini-ai' | 'openai' | 'replicate' | 'local-neural-compositor';
  liveApiActive: boolean;
  afterImageUrl: string | null;
  promptUsed: string;
  durationMs: number;
  outcome?: 'no_provider' | 'failed' | 'invalid_image' | undefined;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const LOCAL_EXT_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/** Hosts the server may fetch images from (never arbitrary URLs: SSRF protection). */
function allowedRemoteHosts(): string[] {
  const hosts = ['fal.media', 'v3.fal.media', 'v3b.fal.media', 'storage.googleapis.com'];
  for (const raw of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (raw) hosts.push(new URL(raw).hostname);
    } catch {
      // ignore malformed env
    }
  }
  for (const extra of (process.env.AI_IMAGE_HOST_ALLOWLIST || '').split(',')) {
    if (extra.trim()) hosts.push(extra.trim());
  }
  return hosts;
}

export function isAllowedRemoteImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return allowedRemoteHosts().some((h) => host === h || host.endsWith(`.${h}`));
}

/** Validates a data URI: allowed image mime, valid base64, size cap. */
function validDataUri(uri: string): string | null {
  const match = uri.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const mime = (match[1] || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return null;
  const approxBytes = Math.floor(((match[2] || '').length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES || approxBytes < 4) return null;
  return uri;
}

/**
 * Resolves an image source (data URI, allow-listed https URL, or a file under /public)
 * into a Data URI so external AI APIs can process it. Anything else resolves to null.
 */
export async function resolveImageToDataUri(src: string | undefined): Promise<string | null> {
  if (!src || src.trim().length === 0) return null;
  const trimmed = src.trim();

  if (trimmed.startsWith('data:')) {
    return validDataUri(trimmed);
  }

  if (trimmed.startsWith('https://')) {
    if (!isAllowedRemoteImageUrl(trimmed)) return null;
    try {
      const res = await fetch(trimmed, { signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (!res.ok) return null;
      const contentType = (res.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
      if (!ALLOWED_MIME.has(contentType)) return null;
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > MAX_IMAGE_BYTES) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) return null;
      return `data:${contentType};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    try {
      const publicDir = path.resolve(process.cwd(), 'public');
      const rel = decodeURIComponent(trimmed.split('?')[0] || '').replace(/^\/+/, '');
      const fullPath = path.resolve(publicDir, rel);
      // Path traversal guard: must stay inside /public
      if (fullPath !== publicDir && !fullPath.startsWith(publicDir + path.sep)) return null;
      const mime = LOCAL_EXT_MIME[path.extname(fullPath).toLowerCase()];
      if (!mime) return null;
      const buf = await fs.readFile(fullPath);
      if (buf.length > MAX_IMAGE_BYTES) return null;
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  return null;
}

function buildPrecisionAutomotivePrompt(req: DirectFitmentRequest): string {
  const angleDescriptions: Record<string, string> = {
    front: 'front 0-degree symmetrical studio view',
    rear: 'rear 180-degree symmetrical view',
    right: 'right side 90-degree profile view',
    left: 'left side 90-degree profile view',
    'front-left': 'front-left 3/4 dynamic automotive angle',
    'front-right': 'front-right 3/4 dynamic automotive angle',
    'rear-left': 'rear-left 3/4 dynamic automotive angle',
    'rear-right': 'rear-right 3/4 dynamic automotive angle',
  };

  const angleText = angleDescriptions[req.angleId || 'front-left'] || '3/4 automotive view';

  if (req.mode === 'enhance_for_video') {
    const partNames = req.parts.map((p) => `${p.name} (${p.category})`).join(', ');
    return [
      `Ultra-sharp 8K commercial automotive cinematography frame of this exact car in the exact same location and background (${angleText}).`,
      partNames
        ? `The vehicle is fitted with ${partNames} with 100% OEM+ precision fitment.`
        : '',
      'Enhance optical clarity, reflections on the bodywork, rim metallic micro-contrast, and natural dynamic range.',
      'Strictly preserve the exact car model, license plate area, background architecture, and camera perspective.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  const partInstructions = req.parts.map((p) => {
    const cat = p.category.toLowerCase();
    const specText = p.spec ? ` (${p.spec})` : '';
    if (cat.includes('wheel') || cat.includes('disk')) {
      return `Mount "${p.name}"${specText} forged wheels/rims into the wheel wells with exact spoke geometry, brake caliper clearance, and realistic tire sidewalls`;
    }
    if (cat.includes('body') || cat.includes('bamper') || cat.includes('aero')) {
      return `Install "${p.name}"${specText} aerodynamic body kit / bumper fascia seamlessly aligned with factory body panel gaps and matching paint/carbon weave reflections`;
    }
    if (cat.includes('perf') || cat.includes('light') || cat.includes('fara')) {
      return `Fit "${p.name}"${specText} crystal LED headlights/taillights into the factory lamp housings with realistic DRL illumination`;
    }
    if (p.swatch || cat.includes('color') || cat.includes('wrap')) {
      return `Refinish the exterior body panels in "${p.name}" (${p.swatch || 'custom automotive wrap'}) while preserving all window glass, trim, and realistic environment reflections`;
    }
    return `Install "${p.name}"${specText} (${p.category}) with 100% factory-grade fitment`;
  });

  return [
    `Photorealistic 4K automotive tuning modification on the exact input car (${angleText}).`,
    ...partInstructions,
    req.referenceAfter
      ? 'The LAST input image shows this same car already modified, taken from a different angle: use it ONLY as a reference for how the new parts, wheel design and paint look, and reproduce them identically. Never copy its camera angle or background.'
      : '',
    `Only modify what is actually visible from this ${angleText}; do not invent parts that are hidden from this viewpoint.`,
    'CRITICAL RULES: Keep the exact same car make/model, exact same camera angle, and exact same background environment.',
    'Do not alter the background or change the vehicle into a different car. Photorealistic shadows, reflections, and OEM+ studio quality.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * 1. FAL.AI Engine (`FAL_KEY` or `FAL_API_KEY`)
 * Reference-aware editors first (car + exact part photos), then single-image Kontext.
 * `FAL_MODEL` may force a specific endpoint id (e.g. "fal-ai/nano-banana/edit").
 */
async function runFalAiFitment(
  apiKey: string,
  carDataUri: string,
  partDataUris: string[],
  prompt: string,
  mode: 'fitment' | 'enhance_for_video',
  referenceDataUri: string | null
): Promise<string | null> {
  const forced = (process.env.FAL_MODEL || '').trim();
  // Order matters (the prompt refers to it): 1 = car photo, then exact parts, last = same-build reference
  const refs = [carDataUri, ...partDataUris.slice(0, 3), ...(referenceDataUri ? [referenceDataUri] : [])];
  const endpoints: Array<{ id: string; body: Record<string, unknown> }> = [];

  if ((partDataUris.length > 0 || referenceDataUri) && mode === 'fitment') {
    endpoints.push({
      id: 'fal-ai/nano-banana/edit',
      body: { prompt, image_urls: refs, num_images: 1, output_format: 'jpeg' },
    });
    endpoints.push({
      id: 'fal-ai/flux-pro/kontext/multi',
      body: { prompt, image_urls: refs, guidance_scale: 3.5, num_images: 1, output_format: 'jpeg' },
    });
  }
  endpoints.push({
    id: 'fal-ai/flux-pro/kontext',
    body: { prompt, image_url: carDataUri, guidance_scale: 3.5, num_images: 1, output_format: 'jpeg' },
  });

  const ordered = forced
    ? [...endpoints.filter((e) => e.id === forced), ...endpoints.filter((e) => e.id !== forced)]
    : endpoints;

  for (const endpoint of ordered) {
    try {
      const res = await fetch(`https://fal.run/${endpoint.id}`, {
        method: 'POST',
        headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint.body),
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { images?: Array<{ url?: string }>; image?: { url?: string } };
      const outputUrl = data.images?.[0]?.url || data.image?.url;
      if (outputUrl) return outputUrl;
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

/**
 * 2. GOOGLE GEMINI MULTIMODAL ENGINE (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)
 * Sends both the base car image AND the selected part reference images so Gemini
 * replicates the exact part details onto the vehicle.
 */
async function runGeminiMultimodalFitment(
  apiKey: string,
  carDataUri: string,
  partDataUris: string[],
  prompt: string,
  referenceDataUri: string | null
): Promise<string | null> {
  const parseBase64 = (uri: string) => {
    const match = uri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1] || 'image/jpeg', data: match[2] || '' };
  };

  const carInline = parseBase64(carDataUri);
  if (!carInline) return null;

  const contentParts: Array<Record<string, unknown>> = [
    {
      text: `${prompt}\nThe first image is the customer's car. Any following images are the exact tuning parts that must be installed onto the car with 100% identical visual details.`,
    },
    { inlineData: carInline },
  ];

  for (const pUri of partDataUris.slice(0, 3)) {
    const parsed = parseBase64(pUri);
    if (parsed) {
      contentParts.push({ inlineData: parsed });
    }
  }
  if (referenceDataUri) {
    const ref = parseBase64(referenceDataUri);
    if (ref) contentParts.push({ inlineData: ref });
  }

  const models = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: contentParts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
        signal: AbortSignal.timeout(55_000),
      });

      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string };
            }>;
          };
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
    } catch {
      // Try next Gemini model
    }
  }

  return null;
}

/**
 * 3. OPENAI IMAGE ENGINE (`OPENAI_API_KEY`)
 */
async function runOpenAiFitment(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1024',
        quality: 'high',
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = data.data?.[0];
    if (first?.b64_json) {
      return `data:image/png;base64,${first.b64_json}`;
    }
    if (first?.url) {
      return first.url;
    }
  } catch {
    // Ignore
  }
  return null;
}

/** True when at least one AI provider key is present in the environment. */
export function hasAiProvider(): boolean {
  const k = (v: string | undefined) => (v ?? '').trim().length > 8;
  return k(process.env.FAL_KEY) || k(process.env.FAL_API_KEY) || k(process.env.GEMINI_API_KEY) || k(process.env.GOOGLE_API_KEY) || k(process.env.OPENAI_API_KEY);
}

/**
 * Master Drop-in AI Execution Router:
 * Automatically checks `.env` / `.env.local` for `FAL_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY`
 * and executes live neural fitment.
 */
export async function executeDirectAiFitment(
  req: DirectFitmentRequest
): Promise<DirectFitmentResponse> {
  const startMs = Date.now();
  const promptUsed = buildPrecisionAutomotivePrompt(req);

  const falKey = (process.env.FAL_KEY || process.env.FAL_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();

  const carDataUri = await resolveImageToDataUri(req.carPhoto);
  const partDataUris = carDataUri
    ? (await Promise.all(req.parts.map((p) => resolveImageToDataUri(p.angleImage || p.image)))).filter(
        (u): u is string => Boolean(u)
      )
    : [];
  const referenceDataUri = req.referenceAfter ? await resolveImageToDataUri(req.referenceAfter) : null;
  const providerConfigured = falKey.length > 8 || geminiKey.length > 8 || openAiKey.length > 8;

  if (carDataUri) {
    // Priority 1: Fal.ai FLUX Kontext / Dev
    if (falKey.length > 8) {
      const falUrl = await runFalAiFitment(
        falKey,
        carDataUri,
        partDataUris,
        promptUsed,
        req.mode || 'fitment',
        referenceDataUri
      );
      if (falUrl) {
        return {
          providerUsed: 'fal-ai',
          liveApiActive: true,
          afterImageUrl: falUrl,
          promptUsed,
          durationMs: Date.now() - startMs,
        };
      }
    }

    // Priority 2: Google Gemini Multimodal Image Editing (Car + Exact Part Reference Images)
    if (geminiKey.length > 8) {
      const geminiUrl = await runGeminiMultimodalFitment(
        geminiKey,
        carDataUri,
        partDataUris,
        promptUsed,
        referenceDataUri
      );
      if (geminiUrl) {
        return {
          providerUsed: 'gemini-ai',
          liveApiActive: true,
          afterImageUrl: geminiUrl,
          promptUsed,
          durationMs: Date.now() - startMs,
        };
      }
    }

    // Priority 3: OpenAI Image Generation
    if (openAiKey.length > 8) {
      const openAiUrl = await runOpenAiFitment(openAiKey, promptUsed);
      if (openAiUrl) {
        return {
          providerUsed: 'openai',
          liveApiActive: true,
          afterImageUrl: openAiUrl,
          promptUsed,
          durationMs: Date.now() - startMs,
        };
      }
    }
  }

  return {
    providerUsed: 'local-neural-compositor',
    liveApiActive: false,
    afterImageUrl: null,
    promptUsed,
    durationMs: Date.now() - startMs,
    // 'no_provider' = no API key configured (demo mode); 'failed' = providers were tried and all failed;
    // 'invalid_image' = the car photo was rejected by validation.
    outcome: !carDataUri ? 'invalid_image' : providerConfigured ? 'failed' : 'no_provider',
  };
}

// ---------------------------------------------------------------------------------------------
// Video frame mastering
// ---------------------------------------------------------------------------------------------

export interface VideoEnhanceRequest {
  /** Finished tuned render of one side of the car (data URI or allowed https URL). */
  image: string;
  angleId?: string | undefined;
  /** Names of the installed parts, so the model protects them while relighting. */
  partNames?: string[] | undefined;
}

export interface VideoEnhanceResponse {
  /** data URI of the mastered frame, or null when no provider could do it */
  image: string | null;
  providerUsed: 'fal-ai' | 'gemini-ai' | 'none';
  outcome?: 'no_provider' | 'failed' | 'invalid_image' | undefined;
}

function buildVideoMasterPrompt(req: VideoEnhanceRequest): string {
  const parts = (req.partNames ?? []).filter(Boolean).slice(0, 6).join(', ');
  return [
    'Re-master this exact photo as a hero frame from a premium automotive commercial.',
    'Keep EVERYTHING that is in the photo: the exact same car, make, model, body shape, every installed part' +
      (parts ? ` (${parts})` : '') +
      ', wheel design, paint colour, camera angle, framing and location. Do not add, remove or redesign anything.',
    'Only improve the image quality: razor-sharp detail, clean noise-free surfaces, crisp panel lines,',
    'deep rich blacks, glossy clear-coat reflections, a soft golden rim light along the body lines,',
    'polished metallic micro-contrast on the wheels, subtle cinematic colour grade with warm highlights,',
    'natural shadows under the car, high dynamic range, photorealistic, no text, no watermark, no people.',
  ].join(' ');
}

/** Downloads a provider output URL (https only) into a data URI so the client never hot-links it. */
async function providerImageToDataUri(url: string): Promise<string | null> {
  if (url.startsWith('data:image/')) return validDataUri(url);
  if (!url.startsWith('https://')) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]!.trim().toLowerCase();
    if (!ALLOWED_MIME.has(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Re-renders one finished frame at commercial quality for the video edit.
 * Image-to-image editors only (never text-to-image: the car must stay the same car).
 */
export async function executeVideoEnhance(req: VideoEnhanceRequest): Promise<VideoEnhanceResponse> {
  const falKey = (process.env.FAL_KEY || process.env.FAL_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (falKey.length <= 8 && geminiKey.length <= 8) return { image: null, providerUsed: 'none', outcome: 'no_provider' };

  const src = await resolveImageToDataUri(req.image);
  if (!src) return { image: null, providerUsed: 'none', outcome: 'invalid_image' };
  const prompt = buildVideoMasterPrompt(req);

  if (falKey.length > 8) {
    const url = await runFalAiFitment(falKey, src, [], prompt, 'enhance_for_video', null);
    const data = url ? await providerImageToDataUri(url) : null;
    if (data) return { image: data, providerUsed: 'fal-ai' };
  }
  if (geminiKey.length > 8) {
    const data = await runGeminiMultimodalFitment(geminiKey, src, [], prompt, null);
    const valid = data ? validDataUri(data) : null;
    if (valid) return { image: valid, providerUsed: 'gemini-ai' };
  }
  return { image: null, providerUsed: 'none', outcome: 'failed' };
}
