import { describe, it, expect } from 'vitest';
import { isStrongEnoughPassword, normalizePhone, phoneToEmail } from './phone';

describe('phone helpers', () => {
  it('normalises Uzbek numbers to E.164', () => {
    expect(normalizePhone('90 123 45 67')).toBe('+998901234567');
    expect(normalizePhone('901234567')).toBe('+998901234567');
    expect(normalizePhone('+998 90 123 45 67')).toBe('+998901234567');
    expect(normalizePhone('998901234567')).toBe('+998901234567');
  });

  it('rejects junk', () => {
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });

  it('derives a stable synthetic email', () => {
    expect(phoneToEmail('+998901234567')).toBe('998901234567@phone.carvision.app');
  });

  it('requires letters, digits and 8+ chars', () => {
    expect(isStrongEnoughPassword('abcdefgh')).toBe(false);
    expect(isStrongEnoughPassword('12345678')).toBe(false);
    expect(isStrongEnoughPassword('abc12')).toBe(false);
    expect(isStrongEnoughPassword('abcd1234')).toBe(true);
  });
});
