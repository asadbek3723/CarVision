import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { adminOr401, dayKey, lastDays } from './admin';
import { createAdminSessionToken } from '@/lib/admin-auth';

describe('admin api guard', () => {
  const saved = { pin: process.env.ADMIN_MASTER_PIN, secret: process.env.ADMIN_SESSION_SECRET };
  beforeEach(() => {
    process.env.ADMIN_MASTER_PIN = '482913';
    process.env.ADMIN_SESSION_SECRET = 's'.repeat(40);
  });
  afterEach(() => {
    if (saved.pin === undefined) delete process.env.ADMIN_MASTER_PIN;
    else process.env.ADMIN_MASTER_PIN = saved.pin;
    if (saved.secret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = saved.secret;
  });

  it('rejects requests without a valid admin cookie', () => {
    const res = adminOr401(new NextRequest('http://x.test/api/v1/admin/overview'));
    expect('response' in res && res.response.status).toBe(401);
    const forged = adminOr401(new NextRequest('http://x.test/api', { headers: { cookie: 'cv_admin_session=abc.123.def' } }));
    expect('response' in forged).toBe(true);
  });

  it('accepts a signed session and returns the admin id', () => {
    const token = createAdminSessionToken('a0000000-0000-4000-8000-000000000001');
    const res = adminOr401(new NextRequest('http://x.test/api', { headers: { cookie: `cv_admin_session=${token}` } }));
    expect('adminId' in res && res.adminId).toBe('a0000000-0000-4000-8000-000000000001');
  });
});

describe('chart day helpers', () => {
  it('buckets by Tashkent day', () => {
    expect(dayKey('2026-11-03T20:30:00Z')).toBe('2026-11-04'); // 01:30 next day in UTC+5
    expect(dayKey('2026-11-03T18:59:00Z')).toBe('2026-11-03');
  });
  it('returns n consecutive days ending today', () => {
    const d = lastDays(7);
    expect(d).toHaveLength(7);
    expect(new Set(d).size).toBe(7);
    expect(d[6]).toBe(dayKey(new Date().toISOString()));
  });
});
