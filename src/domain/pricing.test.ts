import { describe, it, expect } from 'vitest';
import { calculateCashierTotal } from './pricing';

describe('domain/pricing', () => {
  it('handles empty build correctly', () => {
    const summary = calculateCashierTotal([]);
    expect(summary.partsTotalCents).toBe(0);
    expect(summary.laborTotalCents).toBe(0);
    expect(summary.grandTotalCents).toBe(0);
    expect(summary.depositAmountCents).toBe(0);
    expect(summary.remainingOnSiteCents).toBe(0);
    expect(summary.itemCount).toBe(0);
  });

  it('calculates 1-item build accurately', () => {
    // Vossen HF-5: $850 parts + $100 labor
    const items = [{ partPriceCents: 85000, laborCostCents: 10000 }];
    const summary = calculateCashierTotal(items);

    expect(summary.partsTotalCents).toBe(85000);
    expect(summary.laborTotalCents).toBe(10000);
    expect(summary.grandTotalCents).toBe(95000); // $950.00
    // 3% of $950.00 is $28.50 -> 2850 cents
    expect(summary.depositAmountCents).toBe(2850);
    expect(summary.remainingOnSiteCents).toBe(92150);
    expect(summary.itemCount).toBe(1);
  });

  it('calculates complex multi-item build with labor and floor deposit', () => {
    const items = [
      { partPriceCents: 15000, laborCostCents: 2000 },
      { partPriceCents: 45000, laborCostCents: 5000 },
      { partPriceCents: 18000, laborCostCents: 3000 },
    ];
    const summary = calculateCashierTotal(items);

    expect(summary.partsTotalCents).toBe(78000);
    expect(summary.laborTotalCents).toBe(10000);
    expect(summary.grandTotalCents).toBe(88000);
    // 3% of $880 = $26.40 -> 2640 cents
    expect(summary.depositAmountCents).toBe(2640);
    expect(summary.remainingOnSiteCents).toBe(85360);
    expect(summary.itemCount).toBe(3);
  });
});
