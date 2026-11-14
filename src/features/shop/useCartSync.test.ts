import { describe, expect, it } from 'vitest';
import { mergeCarts } from './useCartSync';

describe('mergeCarts', () => {
  it('keeps every line from both carts and the larger quantity', () => {
    const merged = mergeCarts({ items: { a: 1, b: 3 }, unselected: [] }, { items: { b: 1, c: 2 }, unselected: [] });
    expect(merged.items).toEqual({ a: 1, b: 3, c: 2 });
  });

  it('drops unselected ids that are not in the cart and removes duplicates', () => {
    const merged = mergeCarts({ items: { a: 1 }, unselected: ['a', 'x'] }, { items: { b: 1 }, unselected: ['a', 'b'] });
    expect(merged.unselected.sort()).toEqual(['a', 'b']);
  });

  it('caps quantities at 999', () => {
    expect(mergeCarts({ items: { a: 999 }, unselected: [] }, { items: { a: 1200 }, unselected: [] }).items['a']).toBe(999);
  });
});
