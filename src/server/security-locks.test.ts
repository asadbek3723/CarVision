import { describe, expect, it } from 'vitest';
import { evaluateLocks } from './security-locks';

const byId = (locks: ReturnType<typeof evaluateLocks>) => Object.fromEntries(locks.map((l) => [l.id, l.ok]));

describe('evaluateLocks', () => {
  it('shows six locks, all off on a bare local setup', () => {
    const locks = evaluateLocks({ env: {}, requestIsHttps: false, privateDb: false });
    expect(locks).toHaveLength(6);
    expect(locks.every((l) => !l.ok)).toBe(true);
  });

  it('turns each lock on only from what it can see', () => {
    const env = {
      VERCEL: '1',
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'car-vision.vercel.app',
      SEC_DB_NETWORK_RESTRICTED: '1',
      SEC_2FA_CONFIRMED: '1',
      SEC_WAF_CONFIRMED: '1',
    };
    expect(Object.values(byId(evaluateLocks({ env, requestIsHttps: true, privateDb: true }))).every(Boolean)).toBe(true);
    const plainHttp = byId(evaluateLocks({ env, requestIsHttps: false, privateDb: false }));
    expect(plainHttp['https']).toBe(false);
    expect(plainHttp['privateDb']).toBe(false);
    // A confirmation flag off Vercel does not make the platform locks true.
    expect(byId(evaluateLocks({ env: { ...env, VERCEL: undefined }, requestIsHttps: true, privateDb: true }))['waf']).toBe(false);
  });

  it('never counts localhost as a stable public address', () => {
    expect(byId(evaluateLocks({ env: { NEXT_PUBLIC_APP_URL: 'https://localhost:3100' }, requestIsHttps: true, privateDb: true }))['stableDomain']).toBe(false);
  });
});
