import { describe, expect, it } from 'vitest';
import { cleanBannerLink, isBannerSlot } from './banners';

describe('cleanBannerLink', () => {
  it('treats an empty link as no link', () => {
    expect(cleanBannerLink(undefined)).toBeNull();
    expect(cleanBannerLink(null)).toBeNull();
    expect(cleanBannerLink('   ')).toBeNull();
  });

  it('accepts an https address and a page inside the app', () => {
    expect(cleanBannerLink('https://example.com/sale')).toBe('https://example.com/sale');
    expect(cleanBannerLink(' /shop/abc ')).toBe('/shop/abc');
  });

  it('rejects anything that could run script or leave the app silently', () => {
    expect(cleanBannerLink('javascript:alert(1)')).toBe('invalid');
    expect(cleanBannerLink('data:text/html,<script>1</script>')).toBe('invalid');
    expect(cleanBannerLink('http://example.com')).toBe('invalid');
    expect(cleanBannerLink('//evil.example')).toBe('invalid');
    expect(cleanBannerLink('/\\evil.example')).toBe('invalid');
    expect(cleanBannerLink('example.com')).toBe('invalid');
    expect(cleanBannerLink(`/${'a'.repeat(600)}`)).toBe('invalid');
  });
});

describe('isBannerSlot', () => {
  it('only knows the shop slot', () => {
    expect(isBannerSlot('shop')).toBe(true);
    expect(isBannerSlot('home')).toBe(false);
    expect(isBannerSlot(undefined)).toBe(false);
  });
});
