import fs from 'node:fs/promises';
import path from 'node:path';
import { hasAnyImageKey, runImageChain } from './image-chain';
import type { ProviderId } from './key-pool';
import { checkRender, hasRenderChecker, type RenderCheck } from './render-check';

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
  outcome?: 'no_provider' | 'failed' | 'busy' | 'no_quota' | 'blocked' | 'invalid_image' | 'wrong_view' | undefined;
  /** What the second-look check said about the delivered picture (absent when it did not run). */
  check?: RenderCheck | undefined;
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
  const hosts = ['fal.media', 'v3.fal.media', 'v3b.fal.media'];
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
  // Fal also serves results from Google Cloud Storage, but only from its own bucket: any other
  // bucket (or *.storage.googleapis.com) is someone else's file and is not fetched.
  if (host === 'storage.googleapis.com') return url.pathname.startsWith('/falserverless/');
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

export type PaintFinish = 'matte' | 'metallic' | 'pearl' | 'gloss';

/** The finish of a colour part, read from its name and description in any of the shop languages. */
export function paintFinish(p: { name: string; spec?: string | undefined }): PaintFinish {
  const text = `${p.name} ${p.spec ?? ''}`.toLowerCase();
  if (/\bmatte?\b|матов|mat qoplama|\bmat\b|satin|сатин/.test(text)) return 'matte';
  if (/pearl|perlamutr|перламутр|sedef|inci/.test(text)) return 'pearl';
  if (/metal|металл|metalik|metallik/.test(text)) return 'metallic';
  return 'gloss';
}

const FINISH_LOOK: Record<PaintFinish, string> = {
  matte:
    'MATTE finish: no mirror-like reflections at all. Light falls off the curved panels in smooth, soft gradients, highlights are wide and diffuse, reflections of the surroundings become soft blurred glows of light, and the surface shows a very fine even texture',
  metallic:
    'METALLIC finish: glossy clear coat with fine metallic flake that sparkles in the highlights; the colour looks brighter and slightly lighter where the light hits it and deeper and darker on the panels turned away (the metallic flip)',
  pearl:
    'PEARL finish: glossy clear coat with a soft pearlescent shimmer that shifts subtly in the highlights',
  gloss:
    'GLOSS solid finish: a deep glossy clear coat with crisp, sharp reflections of the surroundings exactly where they are in the photo',
};

/**
 * Repaint instruction for a colour. The customer asked for paint that reads as real: lit by the
 * light of the photo, with true shadows and depth, and every small painted detail covered.
 */
function paintInstruction(p: { name: string; spec?: string | undefined; swatch?: string | undefined }): string {
  const finish = paintFinish(p);
  return [
    `REPAINT the whole car body in "${p.name}"${p.swatch ? ` (base tone ${p.swatch})` : ''}. Its reference photo is a close-up sample of this paint: match its hue, depth and finish exactly and ignore everything else in that photo.`,
    `${FINISH_LOOK[finish]}.`,
    'LIGHT FIRST: before painting, read the light in the customer photo: which side the sun or main light comes from, how hard or soft it is and its colour. The new paint is lit by exactly that light. Surfaces facing the light are brighter, surfaces turned away are darker, and the brightness follows the real curvature of every panel (hood, roof, fenders, doors, bumpers, pillars), so the body keeps its full 3D shape.',
    'SHADOWS AND DEPTH: keep every shadow where it is and as dark as it is: under the car, in the wheel arches, under the mirrors and door handles, along creases and character lines, and in every panel gap and door seam, which stay thin and dark. Recesses look deeper and richer, crowns and edges catch the light. Never a flat even fill, never a sticker or plastic look. A dark colour still shows its highlights so the shape stays readable; a light colour never burns out to white.',
    'REFLECTIONS: the reflections of the sky, trees, buildings and ground on the body stay in the same places with the same shapes; only their tint follows the new paint and its finish.',
    'COVER EVERY PAINTED DETAIL, with no spot of the old colour left: every panel, the edges and returns of each panel, the areas around badges, emblems, lamps and the number plate, painted mirror caps, door handles when they are body colour, the fuel flap, painted bumper and sill areas, painted pillars, the lips of the wheel arches and any painted surface visible through a gap.',
    'DO NOT PAINT what is not body paint: glass, rubber seals, chrome, black plastic trim, grille mesh, lamps and lenses, badges and lettering, number plate, wipers, wheels, tyres and brake parts keep their exact original colour.',
    'Every dent, crease, scratch, scuff, chip and panel gap stays visible with the same shape, now in the new colour',
  ].join(' ');
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

  const isCeramic = (p: { category: string; name: string }) => /ceramic|keramik/i.test(`${p.category} ${p.name}`);
  const isPolish = (p: { category: string; name: string }) => /polish|polirov/i.test(`${p.category} ${p.name}`);
  const isColor = (p: { category: string; swatch?: string | undefined }) => Boolean(p.swatch) || /color|wrap|paint/i.test(p.category);
  const isLight = (p: { category: string }) => /light|fara|lamp/i.test(p.category);

  // A bumper or lamp photo is the part fitted on SOME car: that car's paint, lamps and plate are not
  // the part. The paint comes from the colour in this build, else from the customer's own car.
  const colorPart = req.parts.find(isColor);
  const paintText = colorPart
    ? `the new paint colour of this build, "${colorPart.name}"${colorPart.swatch ? ` (${colorPart.swatch})` : ''}, exactly like the rest of the body`
    : "the car's own paint colour from the customer photo, exactly like the fenders and hood beside it";
  const lightsText = req.parts.some(isLight)
    ? 'the lamps listed in this build (and the customer\'s own lamps where none is listed)'
    : 'the lamps of the customer photo, unchanged';

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
      return paintInstruction(p);
    }
    if (cat.includes('wheel') || cat.includes('disk')) {
      return `Replace EVERY visible wheel (front and rear, near side and far side) with "${p.name}"${specText}. All wheels get the identical new design and finish: the exact spoke geometry, the exact colour and finish of the part photo applied over the WHOLE wheel face: spokes, centre, hub, centre cap, lug nuts area, barrel and lip. No part of any wheel keeps the old wheel's colour or design (no silver, white or chrome centre left over unless the part photo has it). Same wheel size and position, tyres and brake calipers kept, realistic contact shadow`;
    }
    if (cat.includes('bumper') || cat.includes('bamper')) {
      return (
        `Replace the front or rear bumper visible from this viewpoint with "${p.name}"${specText}. From its reference photo take ONLY the bumper itself: its shape, contours, air intakes and side vents, fog lamp housings, grille mesh, lip and splitter, rear diffuser and its fins, reflectors built into the bumper, the exhaust tip openings and tips, and the design trims that are not body paint (black, chrome, carbon or coloured accent pieces). ` +
        'That photo shows the bumper fitted on another car: IGNORE everything else in it, including its headlights and tail lights, grille above the bumper, hood, trunk lid, badges, number plate, wheels, background and, above all, its paint colour. ' +
        `Paint the painted surfaces of the new bumper in ${paintText}, so the bumper never keeps the colour of the car in the reference photo. ` +
        `The headlights and tail lights stay ${lightsText}; never copy the lamps of the bumper photo. Align the bumper with the factory panel gaps`
      );
    }
    if (cat.includes('spoiler') || cat.includes('wing')) {
      return `Mount "${p.name}"${specText} on the trunk lid / rear deck exactly like the reference photo (same blade shape, end plates, uprights and finish), correctly scaled to this car and in perspective; it is only visible from rear or side viewpoints`;
    }
    if (cat.includes('light') || cat.includes('fara')) {
      return `Replace the headlights or tail lights visible from this viewpoint with "${p.name}"${specText} inside the factory housings: same LED signature, projector layout and lens tint as the reference photo, identical on the left and right lamp, with a natural daytime running light glow. Take only the lamps from that photo, never its bumper, grille or paint colour`;
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
  const newFinish = colorPart ? paintFinish(colorPart) : null;
  const refinesPaint = req.parts.some((p) => isCeramic(p) || isPolish(p));

  return [
    `This is a precise edit of the customer's real car photo (${angleText}), not a new picture: change only what is listed below, and keep every other pixel of the photo as it is.`,
    'CHANGES TO MAKE:',
    ...partInstructions.map((line, n) => `${n + 1}. ${line}.`),
    'Apply every change completely and identically to EVERY visible instance of that part (all wheels, both headlights, both tail lights, both mirrors, every painted panel): never leave one instance, or part of one, in its old colour or shape.',
    'PART PHOTOS: each part photo may show that part fitted on a different car. Copy from it only the listed part. Never copy anything else from a part photo: not its paint colour, not its other lamps or body parts, not its number plate, not its background.',
    req.referenceAfter
      ? 'The LAST input image shows this same car already modified, taken from a DIFFERENT angle: use it ONLY as a reference for how the new parts look (wheel design and colour including the wheel centre and centre cap, paint, body parts) and reproduce them identically. Never copy its camera angle, its side of the car, its framing or its background.'
      : '',
    `CAMERA: the result must show exactly the same side of the car from exactly the same camera position as the FIRST input image (the customer photo, ${angleText}). If the customer photo shows the front, the result shows the front; if it shows the side, the result shows the same side. Never rotate, turn or re-pose the car.`,
    `Only modify what is actually visible from this ${angleText}; do not invent parts that are hidden from this viewpoint.`,
    'KEEP EXACTLY AS IN THE ORIGINAL PHOTO: car make, model and body shape, camera angle, framing, background, lighting, shadows, number plate, glass, and all existing damage and wear: dents, dings, creases, scratches, scuffs, chips, rust, dirt, stickers.',
    'Never repair, clean, smooth, retouch or beautify anything that was not listed above.',
    refinesPaint
      ? 'Outside the listed paint finish work, change nothing about the paint.'
      : newFinish === 'matte' || newFinish === 'metallic'
        ? `The paint finish becomes the ${newFinish} finish described above; nothing else about the surface changes.`
        : touchesPaint
        ? 'The paint gloss level stays the same as in the original photo.'
        : 'Do not touch the paint: the same colour, the same gloss level, the same swirl marks and dull spots. Do not add extra shine, glow, bloom, HDR look or contrast.',
    'OUTPUT: exactly one picture with the same framing, aspect ratio and camera angle as the customer photo. No text, captions, logos, watermark, border, collage or split screen. Do not add people, animals or objects that are not in the photo.',
    'Result: a photorealistic photo that looks like the same photograph taken after the work was really done: sharp natural detail, the same lens, grain and sensor noise as the original, physically correct contact shadows and reflections, no plastic or painted-over look, no blur, no smearing, no melted or warped shapes, symmetrical wheels and straight panel lines.',
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

    const deadline = req.deadlineMs ? startMs + req.deadlineMs : Number.POSITIVE_INFINITY;
    const left = () => deadline - Date.now();
    const changes = req.parts.map((p) => p.name);

    const render = (prompt: string, reference: string | null) =>
      runImageChain({
        carDataUri,
        partDataUris,
        partLabels,
        referenceDataUri: reference,
        prompt,
        mode: 'fitment',
      }, {
        task: 'fitment',
        ...(Number.isFinite(deadline) ? { deadlineMs: Math.max(8_000, left()) } : {}),
      });

    let chain = await render(promptUsed, referenceDataUri);
    let check: RenderCheck | null = null;

    // Second look: same side as the customer photo, and every wheel / lamp fully changed?
    if (chain.ok && hasRenderChecker()) {
      const afterUri = await resolveImageToDataUri(chain.image);
      check = afterUri ? await checkRender(carDataUri, afterUri, changes, Math.min(9_000, left() - 1_000)) : null;
      // One more try when there is time for a render plus its check. A wrong side is usually the
      // reference render of another angle being copied, so the retry goes without it.
      if (check && (!check.sameView || !check.partsComplete) && left() > 22_000) {
        const fix = !check.sameView
          ? 'IMPORTANT: a previous attempt turned the car and showed another side. Keep the exact camera angle of the customer photo.'
          : `IMPORTANT: a previous attempt left a part unfinished (${check.problem || 'one instance kept the old part or colour'}). Change every instance completely.`;
        const retry = await render(`${promptUsed} ${fix}`, check.sameView ? referenceDataUri : null);
        if (retry.ok) {
          const retryUri = await resolveImageToDataUri(retry.image);
          const retryCheck = retryUri ? await checkRender(carDataUri, retryUri, changes, Math.min(9_000, left() - 500)) : null;
          // Keep the retry unless the check says it is worse (wrong side where the first one was right).
          if (!(retryCheck && !retryCheck.sameView && check.sameView)) {
            chain = retry;
            check = retryCheck;
          }
        }
      }
      if (check && !check.sameView) {
        console.warn('AI render shows another side of the car:', check.problem);
        return {
          providerUsed: chain.ok ? PROVIDER_LABEL[chain.provider] : 'local-neural-compositor',
          liveApiActive: false,
          afterImageUrl: null,
          promptUsed,
          durationMs: Date.now() - startMs,
          outcome: 'wrong_view',
          check,
        };
      }
    }

    if (chain.ok) {
      return {
        providerUsed: PROVIDER_LABEL[chain.provider],
        modelUsed: chain.model,
        liveApiActive: true,
        afterImageUrl: chain.image,
        promptUsed,
        durationMs: Date.now() - startMs,
        check: check ?? undefined,
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
