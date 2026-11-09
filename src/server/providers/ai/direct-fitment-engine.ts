import fs from 'node:fs/promises';
import path from 'node:path';
import { hasAnyImageKey, runImageChain } from './image-chain';
import type { ProviderId } from './key-pool';

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
  /**
   * Total time the caller allows for this call (photo loading included). The provider chain gets
   * what is left, so it never keeps running (and being billed) after the caller gave up.
   */
  deadlineMs?: number | undefined;
}

export interface DirectFitmentResponse {
  providerUsed:
    | 'fal-ai'
    | 'gemini-ai'
    | 'openai'
    | 'openrouter'
    | 'cloudflare-ai'
    | 'local-neural-compositor';
  /** Exact model that produced the image (e.g. "google/gemini-2.5-flash-image"). */
  modelUsed?: string | undefined;
  liveApiActive: boolean;
  afterImageUrl: string | null;
  promptUsed: string;
  durationMs: number;
  outcome?: 'no_provider' | 'failed' | 'busy' | 'no_quota' | 'blocked' | 'invalid_image' | undefined;
}

const PROVIDER_LABEL: Record<ProviderId, Exclude<DirectFitmentResponse['providerUsed'], 'local-neural-compositor'>> = {
  gemini: 'gemini-ai',
  openrouter: 'openrouter',
  fal: 'fal-ai',
  openai: 'openai',
  cloudflare: 'cloudflare-ai',
};

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

  const isCeramic = (p: { category: string; name: string }) => /ceramic|keramik/i.test(`${p.category} ${p.name}`);
  const isPolish = (p: { category: string; name: string }) => /polish|polirov/i.test(`${p.category} ${p.name}`);
  const isColor = (p: { category: string; swatch?: string | undefined }) => Boolean(p.swatch) || /color|wrap|paint/i.test(p.category);

  const partInstructions = req.parts.map((p) => {
    const cat = p.category.toLowerCase();
    const specText = p.spec ? ` (${p.spec})` : '';
    if (isCeramic(p)) {
      return `CERAMIC COATING "${p.name}": show the paint exactly as if a professional ceramic coating was applied to the existing paint. Only the clear-coat surface changes: slightly deeper, cleaner and crisper reflections, light swirl marks and haze gone. The body shape, dents, creases and deep scratches stay exactly as in the photo`;
    }
    if (isPolish(p)) {
      return `PAINT POLISHING "${p.name}": show the paint exactly as if it was machine-polished (paint correction). Swirl marks, haze, oxidation and light surface scratches are removed and the gloss is even and natural. Dents, creases, deep scratches, chips and damaged areas stay exactly as in the photo`;
    }
    if (isColor(p)) {
      return `Change ONLY the exterior paint colour to "${p.name}" (${p.swatch || 'custom automotive wrap'}). Recolour the painted body panels in place: every dent, crease, scratch, scuff, chip and panel gap stays visible with the same shape, and the reflections keep the same position and intensity as in the original photo. Do not make the paint glossier or shinier than it was. Windows, glass, trim, lamps, tyres and wheels keep their original colour`;
    }
    if (cat.includes('wheel') || cat.includes('disk')) {
      return `Replace the wheels with "${p.name}"${specText}: exact spoke geometry from the reference photo, same wheel size position, brake calipers and tyre sidewalls kept, realistic contact shadow`;
    }
    if (cat.includes('bumper') || cat.includes('bamper')) {
      return `Replace the front or rear bumper visible from this viewpoint with "${p.name}"${specText}: exact shape, intakes, grille mesh and lip from the reference photo, aligned with the factory panel gaps, painted in the car's current colour unless the part is carbon or black by design`;
    }
    if (cat.includes('spoiler') || cat.includes('wing')) {
      return `Mount "${p.name}"${specText} on the trunk lid / rear deck exactly like the reference photo (same blade shape, end plates, uprights and finish), correctly scaled to this car and in perspective; it is only visible from rear or side viewpoints`;
    }
    if (cat.includes('light') || cat.includes('fara')) {
      return `Replace the headlights or tail lights with "${p.name}"${specText} inside the factory housings: same LED signature, projector layout and lens tint as the reference photo, with a natural daytime running light glow`;
    }
    if (cat.includes('body') || cat.includes('aero')) {
      return `Replace the matching body part with "${p.name}"${specText}, aligned with the factory panel gaps and painted in the car's current paint colour (or the shown carbon weave)`;
    }
    if (cat.includes('perf') || cat.includes('light') || cat.includes('fara')) {
      return `Replace the lamps with "${p.name}"${specText} inside the factory housings, with natural DRL illumination`;
    }
    return `Install "${p.name}"${specText} (${p.category}) with factory-grade fitment`;
  });

  const touchesPaint = req.parts.some((p) => isColor(p) || isCeramic(p) || isPolish(p));
  const refinesPaint = req.parts.some((p) => isCeramic(p) || isPolish(p));

  return [
    `This is a precise edit of the customer's real car photo (${angleText}), not a new picture: change only what is listed below, and keep every other pixel of the photo as it is.`,
    'CHANGES TO MAKE:',
    ...partInstructions.map((line, n) => `${n + 1}. ${line}.`),
    req.referenceAfter
      ? 'The LAST input image shows this same car already modified, taken from a different angle: use it ONLY as a reference for how the new parts, wheel design and paint look, and reproduce them identically. Never copy its camera angle or background.'
      : '',
    `Only modify what is actually visible from this ${angleText}; do not invent parts that are hidden from this viewpoint.`,
    'KEEP EXACTLY AS IN THE ORIGINAL PHOTO: car make, model and body shape, camera angle, framing, background, lighting, shadows, number plate, glass, and all existing damage and wear: dents, dings, creases, scratches, scuffs, chips, rust, dirt, stickers.',
    'Never repair, clean, smooth, retouch or beautify anything that was not listed above.',
    refinesPaint
      ? 'Outside the listed paint finish work, change nothing about the paint.'
      : touchesPaint
        ? 'The paint gloss level stays the same as in the original photo.'
        : 'Do not touch the paint: the same colour, the same gloss level, the same swirl marks and dull spots. Do not add extra shine, glow, bloom, HDR look or contrast.',
    'OUTPUT: exactly one picture with the same framing, aspect ratio and camera angle as the customer photo. No text, captions, logos, watermark, border, collage or split screen. Do not add people, animals or objects that are not in the photo.',
    'Result: a photorealistic photo that looks like the same photograph taken after the work was really done, with natural shadows and reflections.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** True when at least one AI provider key is present in the environment. */
export function hasAiProvider(): boolean {
  return hasAnyImageKey();
}

/**
 * Master AI execution router. Models from every configured provider (Gemini, OpenRouter, Fal,
 * OpenAI, Cloudflare Workers AI) are ranked by quality; the strongest is tried first, every key of a
 * provider is rotated on rate limits, then the next model takes over (see `image-chain.ts`).
 */
export async function executeDirectAiFitment(
  req: DirectFitmentRequest
): Promise<DirectFitmentResponse> {
  const startMs = Date.now();
  const promptUsed = buildPrecisionAutomotivePrompt(req);

  const carDataUri = await resolveImageToDataUri(req.carPhoto);
  const providerConfigured = hasAnyImageKey();

  if (carDataUri && providerConfigured) {
    // Reference photos of the parts, each with the part's name so the model knows which is which.
    const withPhoto = (
      await Promise.all(
        req.parts.map(async (p) => ({ label: `${p.name} (${p.category})`, uri: await resolveImageToDataUri(p.angleImage || p.image) }))
      )
    ).filter((r): r is { label: string; uri: string } => Boolean(r.uri));
    const partDataUris = withPhoto.map((r) => r.uri);
    const partLabels = withPhoto.map((r) => r.label);
    const referenceDataUri = req.referenceAfter ? await resolveImageToDataUri(req.referenceAfter) : null;

    const chain = await runImageChain({
      carDataUri,
      partDataUris,
      partLabels,
      referenceDataUri,
      prompt: promptUsed,
      mode: req.mode || 'fitment',
    }, {
      task: 'fitment',
      ...(req.deadlineMs ? { deadlineMs: Math.max(8_000, req.deadlineMs - (Date.now() - startMs)) } : {}),
    });

    if (chain.ok) {
      return {
        providerUsed: PROVIDER_LABEL[chain.provider],
        modelUsed: chain.model,
        liveApiActive: true,
        afterImageUrl: chain.image,
        promptUsed,
        durationMs: Date.now() - startMs,
      };
    }
    console.warn(
      'AI image chain failed:',
      chain.reason,
      chain.attempts.map((a) => `${a.provider}:${a.model}=${a.kind}`).join(', ')
    );
    return {
      providerUsed: 'local-neural-compositor',
      liveApiActive: false,
      afterImageUrl: null,
      promptUsed,
      durationMs: Date.now() - startMs,
      outcome:
        chain.reason === 'busy' ? 'busy' : chain.reason === 'no_quota' ? 'no_quota' : chain.reason === 'blocked' ? 'blocked' : 'failed',
    };
  }

  return {
    providerUsed: 'local-neural-compositor',
    liveApiActive: false,
    afterImageUrl: null,
    promptUsed,
    durationMs: Date.now() - startMs,
    // 'no_provider' = no API key configured (demo mode); 'invalid_image' = car photo rejected by validation.
    outcome: !carDataUri ? 'invalid_image' : 'no_provider',
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
  providerUsed: Exclude<DirectFitmentResponse['providerUsed'], 'local-neural-compositor'> | 'none';
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
  if (!hasAnyImageKey()) return { image: null, providerUsed: 'none', outcome: 'no_provider' };

  const src = await resolveImageToDataUri(req.image);
  if (!src) return { image: null, providerUsed: 'none', outcome: 'invalid_image' };

  // Same ranked, key-rotating chain as the fitment render (image-to-image editors only).
  // Cloudflare is left out unless CLOUDFLARE_VIDEO_ENHANCE=1: this call is free for the customer and
  // one video is ~5 frames, which would eat the daily Workers AI allocation the paid renders need.
  // Without a provider the reel still renders with the built-in grade.
  const chain = await runImageChain({
    carDataUri: src,
    partDataUris: [],
    referenceDataUri: null,
    prompt: buildVideoMasterPrompt(req),
    mode: 'enhance_for_video',
  }, {
    task: 'video_frame',
    ...(process.env.CLOUDFLARE_VIDEO_ENHANCE === '1' ? {} : { excludeProviders: ['cloudflare'] }),
  });
  if (!chain.ok && chain.reason === 'no_provider') return { image: null, providerUsed: 'none', outcome: 'no_provider' };
  if (!chain.ok) return { image: null, providerUsed: 'none', outcome: 'failed' };

  const valid = validDataUri(chain.image) ?? (await providerImageToDataUri(chain.image));
  if (!valid) return { image: null, providerUsed: 'none', outcome: 'failed' };
  return { image: valid, providerUsed: PROVIDER_LABEL[chain.provider] };
}
