import type { ProviderId } from './key-pool';

/**
 * Every image model the app can use, ranked by output quality (lower rank = stronger).
 * The chain always tries the strongest model first and falls through the list when a model is
 * rate limited, out of quota or unavailable on all keys.
 */
export interface ImageModelSpec {
  provider: ProviderId;
  /** Provider specific model id (OpenRouter slug, Gemini model, Fal endpoint, ...). */
  model: string;
  /** Can take the customer's car photo (and part photos) as input, i.e. real image editing. */
  supportsEdit: boolean;
  rank: number;
}

export const STATIC_IMAGE_MODELS: ImageModelSpec[] = [
  // Nano Banana 2: about half the price of Pro with near-Pro quality, so it goes first and Pro is
  // the fallback when it is busy or fails (override per task with IMAGE_MODEL_FITMENT).
  // Google's current stable ids come first; the `-preview` ids are what some Vertex AI setups still
  // call the same models. An id that does not exist answers 404 (free) and is skipped for an hour.
  { provider: 'gemini', model: 'gemini-3.1-flash-image', supportsEdit: true, rank: 3 },
  { provider: 'gemini', model: 'gemini-3.1-flash-image-preview', supportsEdit: true, rank: 3.1 },
  { provider: 'gemini', model: 'gemini-3-pro-image', supportsEdit: true, rank: 4 },
  { provider: 'gemini', model: 'gemini-3-pro-image-preview', supportsEdit: true, rank: 4.1 },
  // Legacy (Google announced its shutdown for 2027); keeps working as a last Gemini fallback.
  { provider: 'gemini', model: 'gemini-2.5-flash-image', supportsEdit: true, rank: 14 },
  { provider: 'fal', model: 'fal-ai/nano-banana/edit', supportsEdit: true, rank: 16 },
  { provider: 'fal', model: 'fal-ai/flux-pro/kontext/multi', supportsEdit: true, rank: 31 },
  { provider: 'fal', model: 'fal-ai/flux-pro/kontext', supportsEdit: true, rank: 41 },
  { provider: 'openai', model: 'gpt-image-1', supportsEdit: false, rank: 12 },
  // Cloudflare Workers AI, FLUX.2 [dev]: real multi-reference image editing (car photo + up to 3
  // part / reference photos), keeps the framing of the customer's photo. FLUX.2 [klein] is left out
  // on purpose: on Workers AI it flags ordinary car photos as unsafe (error 3030) every time.
  { provider: 'cloudflare', model: '@cf/black-forest-labs/flux-2-dev', supportsEdit: true, rank: 13 },
  // Known-good OpenRouter fallback when /images/models discovery is unavailable
  { provider: 'openrouter', model: 'google/gemini-2.5-flash-image', supportsEdit: true, rank: 15 },
];

/** Quality rank of an OpenRouter image model, judged by its slug (lower = stronger). */
export function rankOpenRouterModel(slug: string): number {
  const id = slug.toLowerCase();
  if (/gemini-3-pro-image|nano-banana-pro/.test(id)) return 5;
  if (/gemini-3\.1.*lite-image/.test(id)) return 9;
  if (/gemini-3\.1.*image|nano-banana-2/.test(id)) return 7;
  if (/gpt-image-2\.6/.test(id)) return 8;
  if (/gpt-image-2\.5/.test(id)) return 9;
  if (/gpt-image-2|gpt-5\.4-image/.test(id)) return 10;
  if (/gpt-image-1-mini/.test(id)) return 27;
  if (/gpt-5-image-mini/.test(id)) return 26;
  if (/gpt-5-image|gpt-image-1/.test(id)) return 12;
  if (/flux-3-image-klein/.test(id)) return 28;
  if (/flux-3-image/.test(id)) return 14;
  if (/gemini-2\.5-flash-image|nano-banana/.test(id)) return 15;
  if (/seedream-5-0-pro/.test(id)) return 13;
  if (/seedream-5-0-lite/.test(id)) return 18;
  if (/seedream-5-0-flash/.test(id)) return 19;
  if (/seedream-4\.5/.test(id)) return 20;
  if (/seedream/.test(id)) return 21;
  if (/hy-image|hunyuan/.test(id)) return 22;
  if (/qwen-image-3-pro/.test(id)) return 23;
  if (/muse/.test(id)) return 24;
  if (/flux\.2-(max|pro)/.test(id)) return 16;
  if (/flux\.2-flex/.test(id)) return 17;
  if (/klein/.test(id)) return 29;
  if (/flux/.test(id)) return 40;
  return 60;
}

interface OpenRouterImageModels {
  data?: Array<{
    id?: string;
    architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  }>;
}

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
let discovered: { at: number; models: ImageModelSpec[] } | null = null;

/** Models served by OpenRouter's dedicated Image API (`/api/v1/images`), cached 1h. Empty on failure. */
export async function discoverOpenRouterModels(now = Date.now()): Promise<ImageModelSpec[]> {
  if (discovered && now - discovered.at < DISCOVERY_TTL_MS) return discovered.models;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/images/models', {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return discovered?.models ?? [];
    const body = (await res.json()) as OpenRouterImageModels;
    const models: ImageModelSpec[] = [];
    for (const m of body.data ?? []) {
      if (!m.id) continue;
      models.push({
        provider: 'openrouter',
        model: m.id,
        supportsEdit: (m.architecture?.input_modalities ?? []).includes('image'),
        rank: rankOpenRouterModel(m.id),
      });
    }
    discovered = { at: now, models };
    return models;
  } catch {
    return discovered?.models ?? [];
  }
}

/** What a call is for. Each task can have its own preferred models (env, see `modelPrefsFor`). */
export type ImageTask = 'fitment' | 'video_frame';

export interface ModelPref {
  provider: ProviderId;
  model: string;
}

const PROVIDER_IDS: ProviderId[] = ['gemini', 'openrouter', 'fal', 'openai', 'cloudflare'];

/**
 * Parses `provider:model,provider:model` (for example
 * `gemini:gemini-3.1-flash-image,openrouter:openai/gpt-image-2`). Unknown providers and malformed
 * entries are ignored, so a typo in an env var cannot break rendering.
 */
export function parseModelPrefs(value: string | undefined): ModelPref[] {
  const prefs: ModelPref[] = [];
  for (const raw of (value ?? '').split(',')) {
    const entry = raw.trim();
    const at = entry.indexOf(':');
    if (at <= 0) continue;
    const provider = entry.slice(0, at).trim().toLowerCase() as ProviderId;
    const model = entry.slice(at + 1).trim();
    if (!PROVIDER_IDS.includes(provider) || model.length < 2) continue;
    prefs.push({ provider, model });
  }
  return prefs;
}

const TASK_ENV: Record<ImageTask, string> = {
  fitment: 'IMAGE_MODEL_FITMENT',
  video_frame: 'IMAGE_MODEL_VIDEO_FRAME',
};

export function modelPrefsFor(task: ImageTask | undefined, env: NodeJS.ProcessEnv = process.env): ModelPref[] {
  return task ? parseModelPrefs(env[TASK_ENV[task]]) : [];
}

/**
 * Puts the preferred models first (in the order given) and keeps everything else behind them as
 * fallback. A preferred model that is not in the plan yet is added as an image editor, as long as
 * its provider has a key; so any new model id works without a code change.
 */
export function prioritizeModels(
  plan: ImageModelSpec[],
  prefs: ModelPref[],
  configuredProviders: Set<ProviderId>
): ImageModelSpec[] {
  if (prefs.length === 0) return plan;
  const front: ImageModelSpec[] = [];
  const used = new Set<string>();
  for (const pref of prefs) {
    if (!configuredProviders.has(pref.provider)) continue;
    const id = `${pref.provider}:${pref.model}`;
    if (used.has(id)) continue;
    used.add(id);
    front.push(
      plan.find((m) => m.provider === pref.provider && m.model === pref.model) ?? {
        provider: pref.provider,
        model: pref.model,
        supportsEdit: true,
        rank: 2,
      }
    );
  }
  return [...front, ...plan.filter((m) => !used.has(`${m.provider}:${m.model}`))];
}

export function resetModelDiscovery(): void {
  discovered = null;
}

/**
 * Final try order: strongest first. Models that cannot edit images are dropped for edits, and models of
 * providers without a key are dropped. Ties keep the direct provider ahead of OpenRouter.
 */
export function planModels(
  candidates: ImageModelSpec[],
  configuredProviders: Set<ProviderId>,
  needsEdit: boolean
): ImageModelSpec[] {
  const unique = new Map<string, ImageModelSpec>();
  for (const spec of candidates) {
    if (!configuredProviders.has(spec.provider)) continue;
    // A text-to-image model never sees the customer's photo: it draws a different car, so the
    // before/after would not match. It is never used for an edit, not even as a last resort.
    if (needsEdit && !spec.supportsEdit) continue;
    unique.set(`${spec.provider}:${spec.model}`, spec);
  }
  const score = (s: ImageModelSpec) => s.rank + (s.provider === 'openrouter' ? 0.5 : 0);
  return [...unique.values()].sort((a, b) => score(a) - score(b));
}
