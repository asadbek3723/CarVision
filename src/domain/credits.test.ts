import { describe, it, expect } from 'vitest';
import { evaluateCreditStatus, deductCreditBalance } from './credits';

describe('domain/credits', () => {
  it('blocks when balance is 0 or negative', () => {
    expect(evaluateCreditStatus({ balance: 0, monthlyQuota: 800 })).toBe('BLOCK_UPGRADE_REQUIRED');
    expect(evaluateCreditStatus({ balance: -1, monthlyQuota: 800 })).toBe('BLOCK_UPGRADE_REQUIRED');
  });

  it('shows warning when below FOMO threshold (10% of quota)', () => {
    // 800 quota -> threshold is 80
    expect(evaluateCreditStatus({ balance: 75, monthlyQuota: 800 })).toBe('SHOW_WARNING');
    expect(evaluateCreditStatus({ balance: 80, monthlyQuota: 800 })).toBe('SHOW_WARNING');
  });

  it('allows normal usage when balance is healthy', () => {
    expect(evaluateCreditStatus({ balance: 500, monthlyQuota: 800 })).toBe('ALLOW');
  });

  it('deducts credit balance accurately', () => {
    expect(deductCreditBalance(40, 1)).toBe(39);
    expect(deductCreditBalance(5, 5)).toBe(0);
  });

  it('throws error when balance is insufficient', () => {
    expect(() => deductCreditBalance(0, 1)).toThrow('Insufficient credits balance');
    expect(() => deductCreditBalance(2, 3)).toThrow('Insufficient credits balance');
  });
});
