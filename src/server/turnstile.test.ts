import { describe, expect, it, vi } from 'vitest';
import { turnstileRequired, verifyTurnstile } from './turnstile';

const on = { TURNSTILE_SECRET_KEY: 'secret' } as unknown as NodeJS.ProcessEnv;
const off = {} as NodeJS.ProcessEnv;
const reply = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);

describe('turnstile', () => {
  it('is not enforced without a secret', async () => {
    expect(turnstileRequired(off)).toBe(false);
    expect(await verifyTurnstile(undefined, '1.1.1.1', off)).toBe(true);
  });

  it('accepts only a token Cloudflare confirms', async () => {
    const ok = reply({ success: true });
    expect(await verifyTurnstile('tok', '1.1.1.1', on, ok)).toBe(true);
    const sent = (ok.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(sent.get('secret')).toBe('secret');
    expect(sent.get('remoteip')).toBe('1.1.1.1');
    expect(await verifyTurnstile('tok', '1.1.1.1', on, reply({ success: false }))).toBe(false);
  });

  it('fails closed: no token, HTTP error, network error', async () => {
    expect(await verifyTurnstile(undefined, '1.1.1.1', on, reply({ success: true }))).toBe(false);
    expect(await verifyTurnstile('tok', '1.1.1.1', on, reply({ success: true }, false))).toBe(false);
    const boom = vi.fn(async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile('tok', '1.1.1.1', on, boom)).toBe(false);
  });
});
