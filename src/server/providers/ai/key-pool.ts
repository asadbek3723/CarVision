/**
 * API key pool with cooldowns.
 *
 * Keys are read from env (comma separated lists allowed). A key that hits a rate limit is put on
 * cooldown (per key+model), a key that is rejected (401/403) is parked for a long time, and a model
 * that does not exist is parked for all keys. State lives in process memory (per serverless instance),
 * which is enough to stop hammering exhausted keys within a warm instance.
 */

export type ProviderId = 'gemini' | 'openrouter' | 'fal' | 'openai' | 'cloudflare';

/** Splits comma/whitespace/newline separated key lists, drops short junk and duplicates. */
export function parseKeys(...values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    for (const raw of (value ?? '').split(/[\s,]+/)) {
      const key = raw.trim();
      if (key.length > 8) seen.add(key);
    }
  }
  return [...seen];
}

/** Reads the keys of one provider from env. Never logs or returns anything but the keys themselves. */
export function envKeys(provider: ProviderId, env: NodeJS.ProcessEnv = process.env): string[] {
  switch (provider) {
    case 'gemini':
      return parseKeys(env.GEMINI_API_KEYS, env.GEMINI_API_KEY, env.GOOGLE_API_KEY);
    case 'openrouter':
      return parseKeys(env.OPENROUTER_API_KEYS, env.OPENROUTER_API_KEY);
    case 'fal':
      return parseKeys(env.FAL_KEYS, env.FAL_KEY, env.FAL_API_KEY);
    case 'openai':
      return parseKeys(env.OPENAI_API_KEYS, env.OPENAI_API_KEY);
    case 'cloudflare':
      return cloudflareKeys(env);
  }
}

const CF_ACCOUNT_ID = /^[a-f0-9]{32}$/i;

/**
 * Cloudflare Workers AI needs an account id next to every API token. Each entry of
 * CLOUDFLARE_API_TOKENS may be `accountId:token` (several accounts) or a bare token, which then
 * uses CLOUDFLARE_ACCOUNT_ID. A token without a valid account id is useless and is dropped, so a
 * half-configured env never switches live generation on. Returned as `accountId:token`.
 */
export function cloudflareKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  const defaultAccount = (env.CLOUDFLARE_ACCOUNT_ID ?? '').trim();
  const out: string[] = [];
  for (const entry of parseKeys(env.CLOUDFLARE_API_TOKENS, env.CLOUDFLARE_API_TOKEN)) {
    const at = entry.indexOf(':');
    const account = at > 0 ? entry.slice(0, at) : defaultAccount;
    const token = at > 0 ? entry.slice(at + 1) : entry;
    if (CF_ACCOUNT_ID.test(account) && token.length > 8) out.push(`${account.toLowerCase()}:${token}`);
  }
  return [...new Set(out)];
}

/** Splits a key produced by `cloudflareKeys` back into its account id and token. */
export function splitCloudflareKey(key: string): { accountId: string; token: string } | null {
  const at = key.indexOf(':');
  if (at <= 0) return null;
  const accountId = key.slice(0, at);
  const token = key.slice(at + 1);
  return CF_ACCOUNT_ID.test(accountId) && token ? { accountId, token } : null;
}

const cooldowns = new Map<string, number>();
const cursors = new Map<ProviderId, number>();

export function setCooldown(id: string, ms: number, now = Date.now()): void {
  cooldowns.set(id, now + Math.max(1_000, ms));
}

export function isCoolingDown(id: string, now = Date.now()): boolean {
  const until = cooldowns.get(id);
  if (until === undefined) return false;
  if (until <= now) {
    cooldowns.delete(id);
    return false;
  }
  return true;
}

export function resetCooldowns(): void {
  cooldowns.clear();
  cursors.clear();
}

/** Cooldown ids never contain the key itself, only its position in the provider's list. */
export const keyScope = (provider: ProviderId, keyIndex: number) => `key:${provider}:${keyIndex}`;
export const keyModelScope = (provider: ProviderId, keyIndex: number, model: string) =>
  `km:${provider}:${keyIndex}:${model}`;
export const modelScope = (provider: ProviderId, model: string) => `model:${provider}:${model}`;

export interface PooledKey {
  key: string;
  index: number;
}

/**
 * Keys usable for `model` right now, in round-robin order (starting after the key used last time),
 * so load spreads over all keys of the provider.
 */
export function usableKeys(
  provider: ProviderId,
  keys: string[],
  model: string,
  now = Date.now()
): PooledKey[] {
  if (keys.length === 0 || isCoolingDown(modelScope(provider, model), now)) return [];
  const start = (cursors.get(provider) ?? 0) % keys.length;
  const ordered: PooledKey[] = [];
  for (let i = 0; i < keys.length; i += 1) {
    const index = (start + i) % keys.length;
    if (
      !isCoolingDown(keyScope(provider, index), now) &&
      !isCoolingDown(keyModelScope(provider, index, model), now)
    ) {
      ordered.push({ key: keys[index]!, index });
    }
  }
  return ordered;
}

/** Remember which key worked so the next request starts with the following one. */
export function advanceCursor(provider: ProviderId, usedIndex: number, total: number): void {
  if (total > 0) cursors.set(provider, (usedIndex + 1) % total);
}
