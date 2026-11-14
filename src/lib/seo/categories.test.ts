import { describe, expect, it } from 'vitest';
import { brandNotInName, seoCategory } from './categories';

describe('seo category and brand helpers', () => {
  it('lists window film under paint, wraps and tint', () => {
    expect(seoCategory({ category: 'other', attributes: { part: 'window_tint' } })).toBe('wrap_paint');
    expect(seoCategory({ category: 'wheels', attributes: {} })).toBe('wheels');
  });

  it('never repeats a brand the name already starts with', () => {
    expect(brandNotInName('3M', '3M Crystalline 70%')).toBe('');
    expect(brandNotInName('BBS', 'CI-R 20"')).toBe('BBS');
    expect(brandNotInName(null, 'Lip')).toBe('');
  });
});
