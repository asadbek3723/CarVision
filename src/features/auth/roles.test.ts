import { describe, expect, it } from 'vitest';
import { isSellerUser } from './roles';

describe('isSellerUser', () => {
  it('is true only for workshop owners', () => {
    expect(isSellerUser({ role: 'b2b_seller' })).toBe(true);
    expect(isSellerUser({ role: 'b2c_user' })).toBe(false);
    expect(isSellerUser({ role: 'super_admin' })).toBe(false);
    expect(isSellerUser(null)).toBe(false);
    expect(isSellerUser(undefined)).toBe(false);
  });
});
