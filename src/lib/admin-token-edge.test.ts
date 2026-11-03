import { describe, it, expect } from 'vitest';
import { createAdminSessionToken, getAdminIdFromToken } from './admin-auth';
import { verifyAdminTokenEdge } from './admin-token-edge';

const SECRET = 'e'.repeat(48);
const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';

describe('edge admin token verification (middleware)', () => {
  const withSecret = async <T,>(fn: () => Promise<T> | T) => {
    const saved = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_SESSION_SECRET = SECRET;
    try {
      return await fn();
    } finally {
      if (saved === undefined) delete process.env.ADMIN_SESSION_SECRET;
      else process.env.ADMIN_SESSION_SECRET = saved;
    }
  };

  it('accepts exactly the tokens the Node verifier accepts', async () => {
    await withSecret(async () => {
      const token = createAdminSessionToken(ADMIN_ID);
      expect(getAdminIdFromToken(token)).toBe(ADMIN_ID);
      expect(await verifyAdminTokenEdge(token, SECRET)).toBe(ADMIN_ID);
    });
  });

  it('rejects forged, tampered, expired and malformed tokens', async () => {
    await withSecret(async () => {
      const now = Date.now();
      const token = createAdminSessionToken(ADMIN_ID, now);
      const [id, ts, sig] = token.split('.') as [string, string, string];

      expect(await verifyAdminTokenEdge(`${id}.${ts}.${'0'.repeat(sig.length)}`, SECRET, now)).toBeNull();
      expect(await verifyAdminTokenEdge(`b0000000-0000-4000-8000-000000000002.${ts}.${sig}`, SECRET, now)).toBeNull();
      expect(await verifyAdminTokenEdge(token, SECRET, now + 4 * 60 * 60 * 1000 + 2000)).toBeNull();
      expect(await verifyAdminTokenEdge(token, 'wrong-secret-wrong-secret-wrong-secret-xx', now)).toBeNull();
      expect(await verifyAdminTokenEdge('garbage', SECRET, now)).toBeNull();
      expect(await verifyAdminTokenEdge(undefined, SECRET, now)).toBeNull();
      expect(await verifyAdminTokenEdge(token, 'short', now)).toBeNull();
    });
  });
});
