import { describe, it, expect } from 'vitest';
import { readJson } from './safe-json';

describe('readJson', () => {
  it('passes real JSON through', async () => {
    const r = await readJson(new Response(JSON.stringify({ success: true, url: 'x' }), { status: 200 }));
    expect(r.ok).toBe(true);
    expect(r.data['url']).toBe('x');
  });

  it('turns a platform HTML 413 into a readable message instead of throwing', async () => {
    const r = await readJson(new Response('<html>Request Entity Too Large</html>', { status: 413 }));
    expect(r.ok).toBe(false);
    expect(r.data.error).toMatch(/katta/);
  });

  it('keeps the server error text when there is one', async () => {
    const r = await readJson(new Response(JSON.stringify({ success: false, error: 'Kreditlar tugadi' }), { status: 402 }));
    expect(r.ok).toBe(false);
    expect(r.data.error).toBe('Kreditlar tugadi');
  });
});
