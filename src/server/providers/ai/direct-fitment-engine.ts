import fs from 'node:fs/promises';
import path from 'node:path';
import { hasAnyImageKey, runImageChain } from './image-chain';
import type { ProviderId } from './key-pool';
import { partZone } from '@/lib/part-visibility';
import { checkRender, hasRenderChecker, renderFaults, type RenderCheck } from './render-check';

export interface FitmentPartInput {
  id: string;
  name: string;
  category: string;
  spec?: string | undefined;
  image?: string | undefined;
  angleImage?: string | undefined;
  swatch?: string | undefined;
  /** Where a bumper / lamp / body part sits: `front`, `rear` or `both` (guessed from the name when absent). */
  zone?: string | undefined;
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
  outcome?: 'no_provider' | 'failed' | 'busy' | 'no_quota' | 'blocked' | 'invalid_image' | 'wrong_view' | 'wrong_car' | undefined;
  /** What the second-look check said about the delivered picture (absent when it did not run). */
  check?: RenderCheck | undefined;
  /** A second render was made because the check found a fault in the first one. */
  retried?: boolean | undefined;
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
function paintInstruction(p: { name: string; spec?: string | undefined; swatch?: string | undefined }, hasPhoto: boolean): string {
  const finish = paintFinish(p);
  return [
    `REPAINT the whole car body in "${p.name}"${p.swatch ? ` (base tone ${p.swatch})` : ''}.`,
    hasPhoto
      ? 'Its reference photo is a close-up sample of this paint: match its hue, depth and finish exactly and ignore everything else in that photo.'
      : `No photo of this paint is given: the colour is exactly ${p.swatch ? `the base tone ${p.swatch}` : 'the one its name describes'}; never take a colour from any other input image.`,
    `${FINISH_LOOK[finish]}.`,
    'LIGHT FIRST: before painting, read the light in the customer photo: which side the sun or main light comes from, how hard or soft it is and its colour. The new paint is lit by exactly that light. Surfaces facing the light are brighter, surfaces turned away are darker, and the brightness follows the real curvature of every panel (hood, roof, fenders, doors, bumpers, pillars), so the body keeps its full 3D shape.',
    'SHADOWS AND DEPTH: keep every shadow where it is and as dark as it is: under the car, in the wheel arches, under the mirrors and door handles, along creases and character lines, and in every panel gap and door seam, which stay thin and dark. Recesses look deeper and richer, crowns and edges catch the light. Never a flat even fill, never a sticker or plastic look. A dark colour still shows its highlights so the shape stays readable; a light colour never burns out to white.',
    'REFLECTIONS: the reflections of the sky, trees, buildings and ground on the body stay in the same places with the same shapes; only their tint follows the new paint and its finish.',
    'COVER EVERY PAINTED DETAIL, with no spot of the old colour left: every panel, the edges and returns of each panel, the areas around badges, emblems, lamps and the number plate, painted mirror caps, door handles when they are body colour, the fuel flap, painted bumper and sill areas, painted pillars, the lips of the wheel arches and any painted surface visible through a gap.',
    'DO NOT PAINT what is not body paint: glass, rubber seals, chrome, black plastic trim, grille mesh, lamps and lenses, badges and lettering, number plate, wipers, wheels, tyres and brake parts keep their exact original colour.',
    'Every dent, crease, scratch, scuff, chip and panel gap stays visible with the same shape, now in the new colour',
  ].join(' ');
}

/** Window film: the "Tint" category, or a part named as one in the shop languages. */
export function isTint(p: { category: string; name: string }): boolean {
  return /tint|tonir|тонир|cam filmi|تظليل/i.test(`${p.category} ${p.name}`);
}

/** Visible light transmission of a film, e.g. "XPEL ... 35% ..." -> 35. Null when the text names none. */
export function tintVlt(p: { name: string; spec?: string | undefined }): number | null {
  const text = `${p.name} ${p.spec ?? ''}`;
  const ok = (v: number) => v >= 1 && v <= 95;
  // A number tied to "VLT" / "light transmission" wins ("VLT 35%", "35% VLT", "35% light").
  const tied =
    text.match(/(?:vlt|light transmission|o'tkazuvchanlik|пропускан\w*)\s*[:\-]?\s*(\d{1,2})\s?%/i) ||
    text.match(/(\d{1,2})\s?%\s*(?:vlt|light|yorug|свет)/i);
  if (tied && ok(Number(tied[1]))) return Number(tied[1]);
  // Otherwise the first percentage that is not about UV / IR / heat ("99% UV", "IR 80%").
  for (const m of text.matchAll(/(\d{1,2})\s?%/g)) {
    const at = m.index ?? 0;
    const around = text.slice(Math.max(0, at - 12), at + m[0].length + 12).toLowerCase();
    if (/\buv\b|\bir\b|infra|heat|issiq|тепл|ультраф|ультрафиол/.test(around)) continue;
    const v = Number(m[1]);
    if (ok(v)) return v;
  }
  return null;
}

function tintInstruction(p: { name: string; spec?: string | undefined }): string {
  const vlt = tintVlt(p);
  const look =
    vlt === null
      ? 'a clearly darker, neutral smoke-grey tint'
      : vlt <= 10
        ? `${vlt}% VLT, a "limo" tint: the glass looks almost black from outside, the interior is barely visible, only bright reflections show on it`
        : vlt <= 25
          ? `${vlt}% VLT: dark smoke-grey glass, the interior is only faintly visible as dim shapes`
          : vlt <= 40
            ? `${vlt}% VLT: medium smoke-grey glass, seats and headrests stay visible but darker`
            : vlt <= 60
              ? `${vlt}% VLT: light smoke-grey glass, the interior stays clearly visible, only slightly darker`
              : `${vlt}% VLT: a very light, almost clear film with a faint neutral tint, the glass looks nearly as in the photo`;
  return [
    `Apply the window tint film "${p.name}" to EVERY window of the car visible from this viewpoint: the windshield, the front and rear side windows, the rear window and any small quarter glass, all with the same film.`,
    `Film darkness: ${look}.`,
    'This is the ONLY change for the tint: no picture of the film is given and none is needed. Do not copy any car, paint, wheel or scene from a shop photo; only the glass of THIS car gets darker by the amount above.',
    'The film is on the inside of the glass: keep every reflection on the glass (sky, trees, buildings, lights) exactly where it is and as bright as it is; the darkening sits behind those reflections. The tint is neutral grey, never blue, green, purple or mirrored, and has no bubbles, creases or visible edges.',
    'Change nothing else: window frames, rubber seals, chrome and black trim, pillars, paint, lamps and the rest of the car stay exactly as in the photo',
  ].join(' ');
}

/**
 * What a part does to the picture. The shop CATEGORY decides first: a wheel or a tint film that
 * happens to carry a colour swatch is never a repaint of the whole car. The name only decides when
 * the category says nothing (or is the shared "Color" tab, where window films also live).
 */
export type PartKind =
  | 'tint'
  | 'ceramic'
  | 'polish'
  | 'color'
  | 'wheels'
  | 'bumper'
  | 'spoiler'
  | 'lights'
  | 'body'
  | 'suspension'
  | 'exhaust'
  | 'interior'
  | 'other';

const TINT_WORDS = /\btint|tonir|тонир|cam filmi|تظليل|window film/i;

export function partKind(p: { category: string; name: string; spec?: string | undefined; swatch?: string | undefined }): PartKind {
  const cat = p.category.toLowerCase();
  const text = `${p.name} ${p.spec ?? ''}`;
  if (/tint|тонир/.test(cat)) return 'tint';
  if (/wheel|disk|disc|rim/.test(cat)) return 'wheels';
  if (/bumper|bamper/.test(cat)) return 'bumper';
  if (/spoiler|wing|spoyler/.test(cat)) return 'spoiler';
  if (/light|fara|lamp|optik/.test(cat)) return 'lights';
  if (/body|aero|obves/.test(cat)) return 'body';
  if (/suspension|podveska/.test(cat)) return 'suspension';
  if (/interior|salon/.test(cat)) return 'interior';
  if (/ceramic|keramik/.test(cat)) return 'ceramic';
  if (/polish|polirov/.test(cat)) return 'polish';
  if (/color|colour|wrap|paint|rang/.test(cat)) return TINT_WORDS.test(text) ? 'tint' : 'color';
  if (/exhaust|glushitel/.test(cat)) return 'exhaust';
  // Category says nothing useful ("Performance", "Other", empty): read the name.
  if (TINT_WORDS.test(text)) return 'tint';
  if (/ceramic|keramik/i.test(text)) return 'ceramic';
  if (/polish|polirov/i.test(text)) return 'polish';
  if (p.swatch) return 'color';
  if (/exhaust|glushitel|muffler|выхлоп/i.test(text)) return 'exhaust';
  return 'other';
}

/**
 * Whether the part's shop photo goes to the image model. Only parts whose SHAPE must be copied send
 * one. A tint, ceramic or polish card is a marketing picture of some other car: sending it makes
 * weaker models paste that car (its colour, its wheels, its background) into the customer's photo.
 * A colour with a swatch is described by the swatch, so its card photo is not needed either.
 */
export function sendsPartPhoto(p: { category: string; name: string; spec?: string | undefined; swatch?: string | undefined }): boolean {
  const kind = partKind(p);
  if (kind === 'tint' || kind === 'ceramic' || kind === 'polish' || kind === 'interior' || kind === 'suspension') return false;
  if (kind === 'color') return !p.swatch;
  return true;
}

/** Which photos matter most when a model takes only a few: shape parts first, a paint sample last. */
const PHOTO_PRIORITY: Record<PartKind, number> = {
  wheels: 0,
  bumper: 1,
  lights: 2,
  body: 3,
  spoiler: 4,
  exhaust: 5,
  other: 6,
  color: 7,
  tint: 9,
  ceramic: 9,
  polish: 9,
  suspension: 9,
  interior: 9,
};

/** Short caption for a part photo: what to take from it and, above all, what to ignore in it. */
export function partPhotoLabel(p: { category: string; name: string; spec?: string | undefined; swatch?: string | undefined }): string {
  const kind = partKind(p);
  const ignore = 'ignore everything else in this photo: the car it is fitted on, that car\'s paint colour, its other lamps, wheels, body parts, number plate and the background';
  switch (kind) {
    case 'wheels':
      return `wheel "${p.name}": copy ONLY the wheel design (spokes, colour and finish of the whole wheel face, centre cap); ${ignore}`;
    case 'bumper':
      return `bumper "${p.name}": copy ONLY the bumper shape and its non-painted trims; ${ignore}`;
    case 'lights':
      return `lamps "${p.name}": copy ONLY the lamp units (LED signature, projectors, lens tint); ${ignore}`;
    case 'spoiler':
      return `spoiler "${p.name}": copy ONLY the spoiler (blade, end plates, uprights, finish); ${ignore}`;
    case 'body':
      return `body part "${p.name}": copy ONLY this body part; ${ignore}`;
    case 'exhaust':
      return `exhaust "${p.name}": copy ONLY the visible exhaust tips; ${ignore}`;
    case 'color':
      return `paint sample "${p.name}": take ONLY its colour and finish; ${ignore}`;
    default:
      return `part "${p.name}": copy ONLY this part; ${ignore}`;
  }
}

/** The part photos to send, most important first (a model may only take the first few). */
export function photoParts<T extends { category: string; name: string; spec?: string | undefined; swatch?: string | undefined }>(parts: T[]): T[] {
  return parts.filter(sendsPartPhoto).sort((a, b) => PHOTO_PRIORITY[partKind(a)] - PHOTO_PRIORITY[partKind(b)]);
}

const ANGLE_TEXT: Record<string, string> = {
  front: 'straight front view',
  rear: 'straight rear view',
  right: 'side profile view',
  left: 'side profile view',
  'front-left': 'front three-quarter view',
  'front-right': 'front three-quarter view',
  'rear-left': 'rear three-quarter view',
  'rear-right': 'rear three-quarter view',
};

const SIDE_VIEWS = new Set(['right', 'left']);

/**
 * The finished state of every region of the car, said once and plainly. Weaker image models mix
 * up long instructions; a closing list of "this region looks like this" keeps them from taking the
 * paint or lamps of a part photo, and keeps every angle of one build identical.
 */
function finalState(req: DirectFitmentRequest): string[] {
  const of = (k: PartKind) => req.parts.find((p) => partKind(p) === k);
  const color = of('color');
  const lines: string[] = [];
  lines.push(
    color
      ? `Paint: the whole body in "${color.name}"${color.swatch ? ` (${color.swatch})` : ''}, including every new body part.`
      : 'Paint: the exact paint colour of the customer photo on the whole body, including every new body part; never the colour of a part photo.'
  );
  const wheels = of('wheels');
  lines.push(wheels ? `Wheels: all of them "${wheels.name}".` : 'Wheels: the wheels of the customer photo, unchanged.');
  const lights = of('lights');
  lines.push(lights ? `Lamps: "${lights.name}" where they are; every other lamp as in the customer photo.` : 'Headlights and tail lights: exactly those of the customer photo, unchanged.');
  const bumper = of('bumper');
  lines.push(bumper ? `Bumper: "${bumper.name}".` : 'Bumpers and grille: exactly those of the customer photo, unchanged.');
  const tint = of('tint');
  const vlt = tint ? tintVlt(tint) : null;
  lines.push(
    tint
      ? `Windows: all tinted with "${tint.name}"${vlt !== null ? ` (${vlt}% VLT)` : ''}.`
      : 'Windows: the glass of the customer photo, unchanged.'
  );
  if (!of('spoiler')) lines.push('No spoiler is added unless the customer photo already has one.');
  return lines;
}

const NO_PHOTO =
  ' No photo of this part is given: ignore every mention of its reference photo above, fit a realistic, high-quality part that matches its name and suits this car, and never take it from the photo of another part';

function partInstruction(p: FitmentPartInput, req: DirectFitmentRequest, side: boolean, hasPhoto: boolean): string {
  const line = partInstructionText(p, req, side, hasPhoto);
  const kind = partKind(p);
  return !hasPhoto && sendsPartPhoto(p) && kind !== 'color' ? `${line}.${NO_PHOTO}` : line;
}

function partInstructionText(p: FitmentPartInput, req: DirectFitmentRequest, side: boolean, hasPhoto: boolean): string {
  const specText = p.spec ? ` (${p.spec})` : '';
  const zone = partZone(p);
  const colorPart = req.parts.find((x) => partKind(x) === 'color');
  // A bumper or lamp photo is the part fitted on SOME car: that car's paint, lamps and plate are not
  // the part. The paint comes from the colour in this build, else from the customer's own car.
  const paintText = colorPart
    ? `the new paint colour of this build, "${colorPart.name}"${colorPart.swatch ? ` (${colorPart.swatch})` : ''}, exactly like the rest of the body`
    : "the car's own paint colour from the customer photo, exactly like the fenders and hood beside it";
  const lightsText = req.parts.some((x) => partKind(x) === 'lights')
    ? 'the lamps listed in this build (and the customer\'s own lamps where none is listed)'
    : 'the lamps of the customer photo, unchanged';
  const sideNote = side
    ? ' From this side view only its corner / side edge is visible: change exactly that visible portion so it matches the same part seen from the front or rear.'
    : '';

  switch (partKind(p)) {
    case 'ceramic':
      return `CERAMIC COATING "${p.name}": show the paint exactly as if a professional ceramic coating was applied to the existing paint. Only the clear-coat surface changes: slightly deeper, cleaner and crisper reflections, light swirl marks and haze gone. The paint colour, the body shape, dents, creases and deep scratches stay exactly as in the photo`;
    case 'polish':
      return `PAINT POLISHING "${p.name}": show the paint exactly as if it was machine-polished (paint correction). Swirl marks, haze, oxidation and light surface scratches are removed and the gloss is even and natural. The paint colour, dents, creases, deep scratches, chips and damaged areas stay exactly as in the photo`;
    case 'color':
      return paintInstruction(p, hasPhoto);
    case 'tint':
      return tintInstruction(p);
    case 'wheels':
      return `Replace EVERY visible wheel (front and rear, near side and far side) with "${p.name}"${specText}. Take only the wheel from its reference photo, never the car it is on. All wheels get the identical new design and finish: the exact spoke geometry, the exact colour and finish of the part photo applied over the WHOLE wheel face: spokes, centre, hub, centre cap, lug nuts area, barrel and lip. No part of any wheel keeps the old wheel's colour or design (no silver, white or chrome centre left over unless the part photo has it). Same wheel size and position, tyres and brake calipers kept, realistic contact shadow`;
    case 'bumper':
      return (
        `Replace the ${zone === 'front' ? 'FRONT bumper (never the rear one)' : zone === 'rear' ? 'REAR bumper (never the front one)' : 'front or rear bumper visible from this viewpoint'} with "${p.name}"${specText}. From its reference photo take ONLY the bumper itself: its shape, contours, air intakes and side vents, fog lamp housings, grille mesh, lip and splitter, rear diffuser and its fins, reflectors built into the bumper, the exhaust tip openings and tips, and the design trims that are not body paint (black, chrome, carbon or coloured accent pieces). ` +
        'That photo shows the bumper fitted on another car: IGNORE everything else in it, including its headlights and tail lights, grille above the bumper, hood, trunk lid, badges, number plate, wheels, background and, above all, its paint colour. ' +
        `Paint the painted surfaces of the new bumper in ${paintText}, so the bumper never keeps the colour of the car in the reference photo. ` +
        `The headlights and tail lights stay ${lightsText}; never copy the lamps of the bumper photo. Align the bumper with the factory panel gaps.${sideNote}`
      );
    case 'spoiler':
      return `Mount "${p.name}"${specText} on the trunk lid / rear deck exactly like the reference photo (same blade shape, end plates, uprights and finish), correctly scaled to this car and in perspective. If the spoiler in the photo is body-coloured, paint it in ${paintText}; carbon, black or unpainted spoilers keep their own finish. Nothing else from that photo`;
    case 'lights':
      return `Replace the ${zone === 'front' ? 'HEADLIGHTS (never the tail lights)' : zone === 'rear' ? 'TAIL LIGHTS (never the headlights)' : 'headlights or tail lights visible from this viewpoint'} with "${p.name}"${specText} inside the factory housings: same LED signature, projector layout and lens tint as the reference photo, identical on the left and right lamp, with a natural daytime running light glow. Take only the lamps from that photo, never its bumper, grille or paint colour.${sideNote}`;
    case 'body':
      return `Replace the matching body part with "${p.name}"${specText}, aligned with the factory panel gaps and painted in ${paintText} (or kept in the carbon / black finish of the part photo when it is unpainted). Take only that part from its photo.${sideNote}`;
    case 'suspension':
      return `SUSPENSION "${p.name}"${specText}: lower the ride height realistically, so the gap between the tyre tops and the wheel arch lips becomes smaller and even on all wheels. Wheels, tyres, body and everything else stay exactly the same`;
    case 'exhaust':
      return `Fit the visible exhaust tips of "${p.name}"${specText} at the rear, exactly like its reference photo, without changing the bumper around them`;
    default:
      return `Install "${p.name}"${specText} (${p.category}) with factory-grade fitment, taking only that part from its photo`;
  }
}

/** Most part photos a model takes (the adapters send at most 3). */
const MAX_PART_PHOTOS = 3;

/** Parts that will have a photo when nothing was resolved yet: a shape part with an image url, at most 3. */
function expectedPhotoIds(parts: FitmentPartInput[]): Set<string> {
  return new Set(photoParts(parts).filter((p) => Boolean(p.angleImage || p.image)).slice(0, MAX_PART_PHOTOS).map((p) => p.id));
}

/**
 * `photoIds` = the parts whose photo really reaches the model. A part without one is told so, or the
 * model would take "its reference photo" to be the photo of another part.
 */
export function buildPrecisionAutomotivePrompt(req: DirectFitmentRequest, photoIds: Set<string> = expectedPhotoIds(req.parts)): string {
  const view = req.angleId || 'front-left';
  const angleText = ANGLE_TEXT[view] || 'three-quarter view';
  const side = SIDE_VIEWS.has(view);
  const kinds = req.parts.map(partKind);
  const partInstructions = req.parts.filter((p) => partKind(p) !== 'interior').map((p) => partInstruction(p, req, side, photoIds.has(p.id)));

  const touchesPaint = kinds.some((k) => k === 'color' || k === 'ceramic' || k === 'polish');
  const colorPart = req.parts.find((p) => partKind(p) === 'color');
  const newFinish = colorPart ? paintFinish(colorPart) : null;
  const refinesPaint = kinds.some((k) => k === 'ceramic' || k === 'polish');
  const hasTint = kinds.includes('tint');

  return [
    `This is a precise edit of the customer's real car photo (the photo shows a ${angleText} of the car), not a new picture: change only what is listed below, and keep every other pixel of the photo as it is. If this description of the view disagrees with the photo, the photo is right.`,
    'CHANGES TO MAKE:',
    ...partInstructions.map((line, n) => `${n + 1}. ${line}.`),
    'Apply every change completely and identically to EVERY visible instance of that part (all wheels, both headlights, both tail lights, both mirrors, every painted panel): never leave one instance, or part of one, in its old colour or shape.',
    'PART PHOTOS: each part photo shows that part, often fitted on a different car. Copy from it only the listed part. Never copy anything else from a part photo: not its paint colour, not its other lamps, wheels or body parts, not its number plate, not its background, not its camera angle. The car stays the customer\'s car.',
    req.referenceAfter
      ? 'The LAST input image shows this same car with this same build already finished, from a DIFFERENT angle: use it ONLY as the reference for how the listed new parts look (wheel design and colour including the wheel centre and centre cap, paint colour and finish, bumper, lamps, spoiler, window tint darkness) and reproduce them identically, so every angle of this build shows exactly the same parts. Never copy its camera angle, its side of the car, its framing or its background, and add nothing from it that is not in the list above.'
      : '',
    `CAMERA: the result must show exactly the same side of the car from exactly the same camera position as the FIRST input image (the customer photo). If the customer photo shows the front, the result shows the front; if it shows the side, the result shows the same side. Never rotate, turn, mirror or re-pose the car.`,
    'Only modify what is actually visible from this viewpoint; do not invent parts that are hidden from it.',
    `KEEP EXACTLY AS IN THE ORIGINAL PHOTO: car make, model and body shape, camera angle, framing, background, lighting, shadows, number plate, ${hasTint ? 'the window glass except for the listed tint film' : 'glass'}, and all existing damage and wear: dents, dings, creases, scratches, scuffs, chips, rust, dirt, stickers.`,
    'Never repair, clean, smooth, retouch or beautify anything that was not listed above.',
    refinesPaint
      ? 'Outside the listed paint finish work, change nothing about the paint.'
      : newFinish === 'matte' || newFinish === 'metallic'
        ? `The paint finish becomes the ${newFinish} finish described above; nothing else about the surface changes.`
        : touchesPaint
          ? 'The paint gloss level stays the same as in the original photo.'
          : 'Do not touch the paint: the same colour, the same gloss level, the same swirl marks and dull spots. Do not add extra shine, glow, bloom, HDR look or contrast.',
    `FINAL RESULT, region by region: ${finalState(req).join(' ')}`,
    'OUTPUT: exactly one picture with the same framing, aspect ratio and camera angle as the customer photo. No text, captions, logos, watermark, border, collage or split screen. Do not add people, animals or objects that are not in the photo.',
    'Result: a photorealistic photo that looks like the same photograph taken after the work was really done: sharp natural detail, the same lens, grain and sensor noise as the original, physically correct contact shadows and reflections, no plastic or painted-over look, no blur, no smearing, no melted or warped shapes, symmetrical wheels and straight panel lines.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * What must NOT change in this build, for the second-look check (the paint when no colour is
 * chosen, the lamps when no lamp is chosen, ...).
 */
export function keepList(parts: Array<{ category: string; name: string; spec?: string | undefined; swatch?: string | undefined }>): string[] {
  const kinds = new Set(parts.map(partKind));
  const keep = ['the same car make, model and body shape', 'the same background'];
  if (!kinds.has('color')) keep.push('the same paint colour as IMAGE 1');
  if (!kinds.has('lights')) keep.push('the same headlights and tail lights as IMAGE 1');
  if (!kinds.has('wheels')) keep.push('the same wheels as IMAGE 1');
  if (!kinds.has('bumper') && !kinds.has('body')) keep.push('the same bumpers and grille as IMAGE 1');
  if (!kinds.has('tint')) keep.push('the same window glass darkness as IMAGE 1');
  return keep;
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
  let promptUsed = buildPrecisionAutomotivePrompt(req);

  const carDataUri = await resolveImageToDataUri(req.carPhoto);
  const providerConfigured = hasAnyImageKey();

  if (carDataUri && providerConfigured) {
    // Reference photos of the parts whose SHAPE must be copied, most important first, each with a
    // caption that says what to take from it and what to ignore (the car it is fitted on).
    // Tint / ceramic / polish cards and colours with a swatch send no photo: see `sendsPartPhoto`.
    const withPhoto = (
      await Promise.all(
        photoParts(req.parts).map(async (p) => ({ id: p.id, label: partPhotoLabel(p), uri: await resolveImageToDataUri(p.angleImage || p.image) }))
      )
    )
      .filter((r): r is { id: string; label: string; uri: string } => Boolean(r.uri))
      .slice(0, MAX_PART_PHOTOS);
    // The prompt says which parts really have a photo (an unreachable image url is not one).
    promptUsed = buildPrecisionAutomotivePrompt(req, new Set(withPhoto.map((r) => r.id)));
    const partDataUris = withPhoto.map((r) => r.uri);
    const partLabels = withPhoto.map((r) => r.label);
    const referenceDataUri = req.referenceAfter ? await resolveImageToDataUri(req.referenceAfter) : null;

    const deadline = req.deadlineMs ? startMs + req.deadlineMs : Number.POSITIVE_INFINITY;
    const left = () => deadline - Date.now();
    const changes = req.parts.filter((p) => partKind(p) !== 'interior').map((p) => p.name);
    const keep = keepList(req.parts);

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
    let retried = false;

    // Second look: same side and same car as the customer photo, nothing changed that was not asked
    // for (paint, lamps, wheels of a part photo), and every wheel / lamp fully changed?
    if (chain.ok && hasRenderChecker()) {
      const afterUri = await resolveImageToDataUri(chain.image);
      check = afterUri ? await checkRender(carDataUri, afterUri, changes, Math.min(9_000, left() - 1_000), keep) : null;
      // One more try when there is time for a render plus its check. A wrong side is usually the
      // reference render of another angle being copied, so the retry goes without it.
      if (check && renderFaults(check) > 0 && left() > 22_000) {
        const fix = !check.sameView || !check.sameCar
          ? 'IMPORTANT: a previous attempt turned the car, showed another side or drew a different car. Keep the exact car and the exact camera angle of the customer photo.'
          : !check.keepsRest
            ? `IMPORTANT: a previous attempt changed something that was not asked for (${check.problem || 'it copied the paint or lamps of a part photo'}). Keep ${keep.join(', ')}.`
            : `IMPORTANT: a previous attempt left a part unfinished (${check.problem || 'one instance kept the old part or colour'}). Change every instance completely.`;
        retried = true;
        const retry = await render(`${promptUsed} ${fix}`, check.sameView && check.sameCar ? referenceDataUri : null);
        if (retry.ok) {
          const retryUri = await resolveImageToDataUri(retry.image);
          const retryCheck = retryUri ? await checkRender(carDataUri, retryUri, changes, Math.min(9_000, left() - 500), keep) : null;
          // Keep the retry unless the check says it is worse than the first picture.
          if (!retryCheck || renderFaults(retryCheck) <= renderFaults(check)) {
            chain = retry;
            check = retryCheck;
          }
        }
      }
      if (check && (!check.sameView || !check.sameCar)) {
        // A before/after pair of two different sides or two different cars is worthless: never deliver it.
        console.warn('AI render shows another side or another car:', check.problem);
        return {
          providerUsed: chain.ok ? PROVIDER_LABEL[chain.provider] : 'local-neural-compositor',
          liveApiActive: false,
          afterImageUrl: null,
          promptUsed,
          durationMs: Date.now() - startMs,
          outcome: check.sameView ? 'wrong_car' : 'wrong_view',
          check,
          retried,
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
        retried,
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
