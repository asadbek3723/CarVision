import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

const BASE = 'https://proj.supabase.co';
let isOwnShopImage: (raw: string, shopId: string) => boolean;
let shopImagePrefix: (shopId: string) => string;

beforeAll(async () => {
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = BASE;
  ({ isOwnShopImage, shopImagePrefix } = await import('./catalog'));
});

describe('isOwnShopImage', () => {
  it('accepts a file in the shop folder', () => {
    expect(isOwnShopImage(`${shopImagePrefix('shop-a')}photo-1.jpg`, 'shop-a')).toBe(true);
  });

  it('rejects other folders, traversal in any spelling, queries and other hosts', () => {
    const own = shopImagePrefix('shop-a');
    expect(isOwnShopImage(`${shopImagePrefix('shop-b')}x.jpg`, 'shop-a')).toBe(false);
    expect(isOwnShopImage(`${own}../shop-b/x.jpg`, 'shop-a')).toBe(false);
    expect(isOwnShopImage(`${own}%2e%2e/shop-b/x.jpg`, 'shop-a')).toBe(false);
    expect(isOwnShopImage(`${own}%2E%2E%2Fshop-b%2Fx.jpg`, 'shop-a')).toBe(false);
    expect(isOwnShopImage(`${own}x.jpg?download=1`, 'shop-a')).toBe(false);
    expect(isOwnShopImage(`${own}`, 'shop-a')).toBe(false);
    expect(isOwnShopImage(`${own}%E0%A4%A`, 'shop-a')).toBe(false);
    expect(isOwnShopImage('https://evil.example/storage/v1/object/public/x.jpg', 'shop-a')).toBe(false);
  });
});
