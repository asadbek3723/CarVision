import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  verifyPinConstantTime,
  createAdminSessionToken,
  verifyAdminSessionToken,
  getAdminIdFromToken,
  isAdminConfigured,
} from './admin-auth';

const SECRET = 'x'.repeat(40);
const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';

describe('Admin security (fails closed, no default secrets)', () => {
  const saved = { pin: process.env.ADMIN_MASTER_PIN, secret: process.env.ADMIN_SESSION_SECRET };

  beforeEach(() => {
    process.env.ADMIN_MASTER_PIN = '482913';
    process.env.ADMIN_SESSION_SECRET = SECRET;
  });

  afterEach(() => {
    if (saved.pin === undefined) delete process.env.ADMIN_MASTER_PIN;
    else process.env.ADMIN_MASTER_PIN = saved.pin;
    if (saved.secret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = saved.secret;
  });

  it('accepts only the configured PIN', () => {
    expect(verifyPinConstantTime('482913')).toBe(true);
    expect(verifyPinConstantTime('3723')).toBe(false);
    expect(verifyPinConstantTime('')).toBe(false);
    expect(verifyPinConstantTime('4829133')).toBe(false);
  });

  it('is closed when env is missing', () => {
    delete process.env.ADMIN_MASTER_PIN;
    delete process.env.ADMIN_SESSION_SECRET;
    expect(isAdminConfigured()).toBe(false);
    expect(verifyPinConstantTime('3723')).toBe(false);
    expect(() => createAdminSessionToken(ADMIN_ID)).toThrow();
    expect(verifyAdminSessionToken('a.1.b')).toBe(false);
  });

  it('rejects a too-short session secret', () => {
    process.env.ADMIN_SESSION_SECRET = 'short';
    expect(isAdminConfigured()).toBe(false);
  });

  it('round-trips a token bound to the admin id', () => {
    const token = createAdminSessionToken(ADMIN_ID);
    expect(verifyAdminSessionToken(token)).toBe(true);
    expect(getAdminIdFromToken(token)).toBe(ADMIN_ID);
  });

  it('rejects tampered, swapped-user, expired and malformed tokens', () => {
    const token = createAdminSessionToken(ADMIN_ID);
    const [, ts, sig] = token.split('.') as [string, string, string];
    expect(verifyAdminSessionToken(`other-user.${ts}.${sig}`)).toBe(false);
    expect(verifyAdminSessionToken(`${ADMIN_ID}.${Number(ts) + 1}.${sig}`)).toBe(false);
    expect(verifyAdminSessionToken(`${ADMIN_ID}.${ts}.${'0'.repeat(64)}`)).toBe(false);
    expect(verifyAdminSessionToken('garbage')).toBe(false);
    expect(verifyAdminSessionToken(undefined)).toBe(false);

    const old = createAdminSessionToken(ADMIN_ID, Date.now() - 5 * 60 * 60 * 1000);
    expect(verifyAdminSessionToken(old)).toBe(false);
  });
});
