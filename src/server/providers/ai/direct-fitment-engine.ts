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
}

export interface DirectFitmentResponse {
  providerUsed:
    | 'fal-ai'
    | 'gemini-ai'
    | 'openai'
    | 'openrouter'
    | 'local-neural-compositor';
  /** Exact model that produced the image (e.g. "google/gemini-2.5-flash-image"). */
  modelUsed?: string | undefined;
  liveApiActive: boolean;
  afterImageUrl: string | null;
  promptUsed: string;
  durationMs: number;
  outcome?: 'no_provider' | 'failed' | 'busy' | 'invalid_image' | undefined;
}

const PROVIDER_LABEL: Record<ProviderId, Exclude<DirectFitmentResponse['providerUsed'], 'local-neural-compositor'>> = {
  gemini: 'gemini-ai',
  openrouter: 'openrouter',
  fal: 'fal-ai',
  openai: 'openai',
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

/** True when at least one AI provider key is present in the environment. */
export function hasAiProvider(): boolean {
  return hasAnyImageKey();
}

/**
 * Master AI execution router. Models from every configured provider (Gemini, OpenRouter, Fal,
 * OpenAI) are ranked by quality; the strongest is tried first, every key of a
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
    const partDataUris = (
      await Promise.all(req.parts.map((p) => resolveImageToDataUri(p.angleImage || p.image)))
    ).filter((u): u is string => Boolean(u));
    const referenceDataUri = req.referenceAfter ? await resolveImageToDataUri(req.referenceAfter) : null;

    const chain = await runImageChain({
      carDataUri,
      partDataUris,
      referenceDataUri,
      prompt: promptUsed,
      mode: req.mode || 'fitment',
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
      outcome: chain.reason === 'busy' ? 'busy' : 'failed',
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
