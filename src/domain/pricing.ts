/**
 * CarVision Pure Domain Module: Pricing & Cashier
 * Calculates itemized parts, labor, grand total, and escrow deposit breakdown.
 */

import { addCents, calculateDepositCents, type Cents } from './money';

export interface PriceItem {
  partPriceCents: Cents;
  laborCostCents: Cents;
}

export interface CashierSummary {
  partsTotalCents: Cents;
  laborTotalCents: Cents;
  grandTotalCents: Cents;
  depositAmountCents: Cents;
  remainingOnSiteCents: Cents;
  itemCount: number;
}

/**
 * Calculates complete cashier breakdown for an array of selected build items.
 */
export function calculateCashierTotal(items: PriceItem[]): CashierSummary {
  if (!Array.isArray(items)) {
    throw new TypeError('Items must be an array');
  }

  const partsTotalCents = items.reduce((sum, item) => addCents(sum, item.partPriceCents), 0);
  const laborTotalCents = items.reduce((sum, item) => addCents(sum, item.laborCostCents), 0);
  const grandTotalCents = addCents(partsTotalCents, laborTotalCents);

  const depositAmountCents = calculateDepositCents(grandTotalCents);
  const remainingOnSiteCents = Math.max(0, grandTotalCents - depositAmountCents);

  return {
    partsTotalCents,
    laborTotalCents,
    grandTotalCents,
    depositAmountCents,
    remainingOnSiteCents,
    itemCount: items.length,
  };
}
