import { describe, it, expect } from 'vitest';
import { addCents, subtractCents, multiplyBps, splitPurchase, cancelRefundCents } from './money';

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

  it('splits a purchase: customer pays the full price, workshop gets the rest', () => {
    expect(splitPurchase(0)).toEqual({ amountCents: 0, commissionCents: 0, payoutCents: 0 });
    expect(splitPurchase(150000)).toEqual({ amountCents: 150000, commissionCents: 4500, payoutCents: 145500 });
    // 3% of 5033 = 150.99 -> 150 (rounded down in the workshop's favour)
    expect(splitPurchase(5033)).toEqual({ amountCents: 5033, commissionCents: 150, payoutCents: 4883 });
    const s = splitPurchase(98765);
    expect(s.commissionCents + s.payoutCents).toBe(s.amountCents);
    expect(() => splitPurchase(10.5)).toThrow(TypeError);
    expect(() => splitPurchase(100, 20000)).toThrow(TypeError);
  });

  it('computes the cancel refund', () => {
    expect(cancelRefundCents(10000)).toBe(8000);
    expect(cancelRefundCents(12345)).toBe(9876);
    expect(cancelRefundCents(0)).toBe(0);
  });
});
