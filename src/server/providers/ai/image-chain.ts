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

const ALL_PROVIDERS: ProviderId[] = ['gemini', 'openrouter', 'fal', 'openai', 'cloudflare'];

/**
 * Whole chain must finish inside the route's maxDuration (60s) with time left to store the picture
 * (a 2K PNG is several MB) and settle the credit, so the chain stops at 44s.
 */
const DEFAULT_DEADLINE_MS = 44_000;
/** A 2K render with thinking can take 20-35s: a shorter cap would throw away a render that is being paid for. */
const MAX_ATTEMPT_MS = 40_000;
/** A transient 5xx / short rate limit gets one more try on the same key if this much time is left. */
const RETRY_MIN_LEFT_MS = 14_000;
const RETRY_DELAY_MS = 1_500;
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
  | { ok: false; reason: 'no_provider' | 'busy' | 'no_quota' | 'blocked' | 'failed'; attempts: ChainAttempt[] };

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
  /** Replaces the retry pause (tests). */
  sleep?: (ms: number) => Promise<void>;
  /** Providers this call must not use (for example a free daily allocation kept for paid renders). */
  excludeProviders?: ProviderId[];
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
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const keyMap = new Map<ProviderId, string[]>();
  for (const provider of ALL_PROVIDERS) {
    if (opts.excludeProviders?.includes(provider)) continue;
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
  let blockedFails = 0; // the model refused the content (safety filter)

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

      const call = (budgetMs: number) => adapters[spec.provider]!(spec, key, input, Math.min(MAX_ATTEMPT_MS, budgetMs - 500));
      let result = await call(remaining);
      // Overload (5xx) and very short rate limits are usually gone a moment later: one more try on
      // the same key is cheaper than falling through to a pricier model.
      if (
        !result.ok &&
        (result.kind === 'server' || (result.kind === 'rate_limit' && (result.retryAfterMs ?? Infinity) <= 3_000)) &&
        deadline - now() > RETRY_MIN_LEFT_MS
      ) {
        await sleep(Math.min(result.kind === 'rate_limit' ? (result.retryAfterMs ?? RETRY_DELAY_MS) : RETRY_DELAY_MS, 3_000));
        const left = deadline - now();
        if (left >= MIN_ATTEMPT_MS) result = await call(left);
      }
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
        case 'blocked':
          // Content refusal: other keys would refuse too, a different model might not.
          blockedFails += 1;
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

  if (blockedFails > 0 && hardFails === 0 && limited === 0) {
    // Every model that answered refused the picture: say so instead of a vague failure.
    return { ok: false, reason: 'blocked', attempts };
  }
  if (limited > 0 && hardFails === 0) {
    // Every key said "no allowance" (or was parked for it): waiting a minute will not help.
    const onlyQuota = quotaFails > 0 && attempts.every((a) => a.kind === 'quota' || a.kind === 'skipped_cooldown');
    return { ok: false, reason: onlyQuota ? 'no_quota' : 'busy', attempts };
  }
  return { ok: false, reason: 'failed', attempts };
}
