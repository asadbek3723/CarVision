import { describe, it, expect } from 'vitest';
import { COUNTRIES, DEFAULT_COUNTRY, buildE164, isPlausibleNational } from './phone-input';
import { normalizePhone } from '@/server/auth/phone';

const kz = COUNTRIES.find((c) => c.id === 'kazakhstan')!;
const tr = COUNTRIES.find((c) => c.id === 'turkey')!;

describe('phone-input', () => {
  it('builds the same E.164 however an Uzbek number is typed', () => {
    for (const typed of ['90 123 45 67', '901234567', '0901234567', '+998 90 123 45 67', '998901234567']) {
      expect(buildE164(DEFAULT_COUNTRY, typed)).toBe('+998901234567');
    }
  });

  it('does not eat a local number that merely starts with 998', () => {
    expect(buildE164(DEFAULT_COUNTRY, '998123456')).toBe('+998998123456');
  });

  it('supports other countries and survives server normalisation', () => {
    expect(buildE164(kz, '701 234 56 78')).toBe('+77012345678');
    expect(normalizePhone(buildE164(kz, '701 234 56 78'))).toBe('+77012345678');
    expect(buildE164(tr, '532 123 45 67')).toBe('+905321234567');
    expect(normalizePhone(buildE164(tr, '0532 123 45 67'))).toBe('+905321234567');
  });

  it('validates the national part', () => {
    expect(isPlausibleNational('90 123 45 67', DEFAULT_COUNTRY)).toBe(true);
    expect(isPlausibleNational('90 123', DEFAULT_COUNTRY)).toBe(false);
    expect(isPlausibleNational('701 234 56 78', kz)).toBe(true);
    expect(isPlausibleNational('12', kz)).toBe(false);
  });
});
