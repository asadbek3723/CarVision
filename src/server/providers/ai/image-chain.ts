import { ADAPTERS, type Adapter, type ChainInput, type FailKind } from './image-adapters';
import {
  STATIC_IMAGE_MODELS,
  discoverOpenRouterModels,
  modelPrefsFor,
  planModels,
  prioritizeModels,
  type ImageModelSpec,
  type ImageTask,
  type ModelPref,
} from './image-models';
import {
  advanceCursor,
  envKeys,
  keyModelScope,
  keyScope,
  modelScope,
  setCooldown,
  usableKeys,
  type ProviderId,
} from './key-pool';

const ALL_PROVIDERS: ProviderId[] = ['gemini', 'openrouter', 'fal', 'openai'];

/** Whole chain must finish inside the route's maxDuration (60s). */
const DEFAULT_DEADLINE_MS = 52_000;
const MAX_ATTEMPT_MS = 28_000;
const MIN_ATTEMPT_MS = 3_000;
/** Keys tried per model before moving on (a 22-key pool must not eat the whole budget). */
const MAX_KEYS_PER_MODEL = 4;

const COOLDOWN_MS = {
  rateLimit: 60_000,
  rateLimitMax: 60 * 60_000,
  quota: 60 * 60_000,
  auth: 24 * 60 * 60_000,
  notFound: 60 * 60_000,
  server: 30_000,
  timeout: 20_000,
};

export interface ChainAttempt {
  provider: ProviderId;
  model: string;
  kind: FailKind | 'skipped_cooldown';
}

export type ChainResult =
  | { ok: true; image: string; provider: ProviderId; model: string; attempts: ChainAttempt[] }
  | { ok: false; reason: 'no_provider' | 'busy' | 'no_quota' | 'failed'; attempts: ChainAttempt[] };

export interface ChainOptions {
  deadlineMs?: number;
  adapters?: Partial<Record<ProviderId, Adapter>>;
  /** Replaces env key lookup (tests). */
  keysFor?: (provider: ProviderId) => string[];
  /** Replaces model discovery (tests). */
  models?: ImageModelSpec[];
  /** What this call is for: picks the `IMAGE_MODEL_<TASK>` env preference. */
  task?: ImageTask;
  /** Replaces the env preference (tests). */
  prefs?: ModelPref[];
  now?: () => number;
}

/** True when at least one provider has a usable key. */
export function hasAnyImageKey(): boolean {
  return ALL_PROVIDERS.some((p) => envKeys(p).length > 0);
}

export async function runImageChain(input: ChainInput, opts: ChainOptions = {}): Promise<ChainResult> {
  const now = opts.now ?? Date.now;
  const started = now();
  const deadline = started + (opts.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const keysFor = opts.keysFor ?? ((p: ProviderId) => envKeys(p));
  const adapters = { ...ADAPTERS, ...opts.adapters };

  const keyMap = new Map<ProviderId, string[]>();
  for (const provider of ALL_PROVIDERS) {
    const keys = keysFor(provider);
    if (keys.length > 0) keyMap.set(provider, keys);
  }
  if (keyMap.size === 0) return { ok: false, reason: 'no_provider', attempts: [] };

  const candidates = opts.models ?? [
    ...STATIC_IMAGE_MODELS,
    ...(keyMap.has('openrouter') ? await discoverOpenRouterModels() : []),
  ];
  const configured = new Set(keyMap.keys());
  const plan = prioritizeModels(
    planModels(candidates, configured, true),
    opts.prefs ?? modelPrefsFor(opts.task),
    configured
  );

  const attempts: ChainAttempt[] = [];
  let limited = 0; // rate limit / quota / cooling down: "come back later"
  let quotaFails = 0; // keys that said they have no allowance at all
  let hardFails = 0; // model really failed on a real attempt

  for (const spec of plan) {
    if (now() >= deadline - MIN_ATTEMPT_MS) break;
    const keys = keyMap.get(spec.provider)!;
    const usable = usableKeys(spec.provider, keys, spec.model, now());
    if (usable.length === 0) {
      attempts.push({ provider: spec.provider, model: spec.model, kind: 'skipped_cooldown' });
      limited += 1;
      continue;
    }

    for (const { key, index } of usable.slice(0, MAX_KEYS_PER_MODEL)) {
      const remaining = deadline - now();
      if (remaining < MIN_ATTEMPT_MS) break;

      const result = await adapters[spec.provider]!(
        spec,
        key,
        input,
        Math.min(MAX_ATTEMPT_MS, remaining - 500)
      );
      if (result.ok) {
        advanceCursor(spec.provider, index, keys.length);
        return { ok: true, image: result.image, provider: spec.provider, model: spec.model, attempts };
      }

      attempts.push({ provider: spec.provider, model: spec.model, kind: result.kind });
      const t = now();
      let nextKey = true;
      switch (result.kind) {
        case 'rate_limit':
          setCooldown(
            keyModelScope(spec.provider, index, spec.model),
            Math.min(result.retryAfterMs ?? COOLDOWN_MS.rateLimit, COOLDOWN_MS.rateLimitMax),
            t
          );
          limited += 1;
          break;
        case 'quota':
          setCooldown(keyScope(spec.provider, index), COOLDOWN_MS.quota, t);
          limited += 1;
          quotaFails += 1;
          break;
        case 'auth':
          setCooldown(keyScope(spec.provider, index), COOLDOWN_MS.auth, t);
          break;
        case 'not_found':
          setCooldown(modelScope(spec.provider, spec.model), COOLDOWN_MS.notFound, t);
          nextKey = false;
          break;
        case 'bad_request':
        case 'empty':
          // The model refused this input: other keys would get the same answer.
          hardFails += 1;
          nextKey = false;
          break;
        case 'timeout':
          setCooldown(modelScope(spec.provider, spec.model), COOLDOWN_MS.timeout, t);
          hardFails += 1;
          nextKey = false;
          break;
        case 'server':
          setCooldown(keyModelScope(spec.provider, index, spec.model), COOLDOWN_MS.server, t);
          hardFails += 1;
          break;
      }
      if (!nextKey) break;
    }
  }

  if (limited > 0 && hardFails === 0) {
    // Every key said "no allowance" (or was parked for it): waiting a minute will not help.
    const onlyQuota = quotaFails > 0 && attempts.every((a) => a.kind === 'quota' || a.kind === 'skipped_cooldown');
    return { ok: false, reason: onlyQuota ? 'no_quota' : 'busy', attempts };
  }
  return { ok: false, reason: 'failed', attempts };
}
