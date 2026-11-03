import { describe, it, expect } from 'vitest';
import { addCents, subtractCents, multiplyBps, calculateDepositCents } from './money';

describe('domain/money', () => {
  it('adds integer cents correctly', () => {
    expect(addCents(100, 250, 4500)).toBe(4850);
    expect(addCents(0)).toBe(0);
  });

  it('rejects floating point numbers with TypeError', () => {
    expect(() => addCents(10.5, 20)).toThrow(TypeError);
    expect(() => subtractCents(100, 20.2)).toThrow(TypeError);
    expect(() => multiplyBps(100.5, 300)).toThrow(TypeError);
  });

  it('subtracts integer cents correctly', () => {
    expect(subtractCents(1000, 350)).toBe(650);
  });

  it('calculates basis points with exact integer rounding', () => {
    // 3% of $100.00 (10000 cents) = 300 cents
    expect(multiplyBps(10000, 300)).toBe(300);
    // 3% of $1450.00 (145000 cents) = 4350 cents
    expect(multiplyBps(145000, 300)).toBe(4350);
    // 10005 * 300 / 10000 = 300.15 -> rounds to 300
    expect(multiplyBps(10005, 300)).toBe(300);
  });

  it('calculates 3% escrow deposit with floor protection', () => {
    // Zero build costs zero deposit
    expect(calculateDepositCents(0)).toBe(0);

    // Cheap item ($50.00 / 5000 cents): 3% is $1.50 (150 cents), but floor is $10.00 (1000 cents)
    expect(calculateDepositCents(5000)).toBe(1000);

    // Large build ($1500.00 / 150000 cents): 3% is $45.00 (4500 cents), exceeding floor
    expect(calculateDepositCents(150000)).toBe(4500);
  });
});
