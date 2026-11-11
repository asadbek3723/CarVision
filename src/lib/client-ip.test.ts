import { describe, expect, it } from 'vitest';
import { clientIpFromHeaders } from './client-ip';

const headers = (h: Record<string, string>) => new Headers(h);

describe('clientIpFromHeaders', () => {
  it('on Vercel ignores client-sent x-forwarded-for and cf-connecting-ip', () => {
    const h = headers({ 'x-forwarded-for': '6.6.6.6', 'cf-connecting-ip': '7.7.7.7', 'x-vercel-forwarded-for': '1.2.3.4' });
    expect(clientIpFromHeaders(h, { VERCEL: '1' })).toBe('1.2.3.4');
    expect(clientIpFromHeaders(headers({ 'x-forwarded-for': '6.6.6.6', 'cf-connecting-ip': '7.7.7.7' }), { VERCEL: '1' })).toBe('');
  });

  it('trusts cf-connecting-ip only when told the site is behind Cloudflare', () => {
    const h = headers({ 'cf-connecting-ip': '7.7.7.7', 'x-forwarded-for': '6.6.6.6' });
    expect(clientIpFromHeaders(h, { TRUST_CLOUDFLARE_IP: '1' })).toBe('7.7.7.7');
    expect(clientIpFromHeaders(h, {})).toBe('6.6.6.6');
  });

  it('takes the first hop and caps the length', () => {
    expect(clientIpFromHeaders(headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }), {})).toBe('9.9.9.9');
    expect(clientIpFromHeaders(headers({ 'x-real-ip': 'a'.repeat(100) }), {}).length).toBe(64);
  });
});
