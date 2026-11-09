/**
 * CarVision Pure Domain Module: Money
 * Integer minor units math, rounding, and the purchase split.
 */

export type Cents = number; // Integer minor units (e.g. $29.00 -> 2900)
export type BasisPoints = number; // 1% = 100 bps

/**
 * Adds multiple minor unit amounts safely.
 */
export function addCents(...amounts: Cents[]): Cents {
  return amounts.reduce((total, amount) => {
    if (!Number.isInteger(amount)) {
      throw new TypeError(`Amount must be an integer, received: ${amount}`);
    }
    return total + amount;
  }, 0);
}

/**
 * Subtracts decrement from base amount.
 */
export function subtractCents(base: Cents, decrement: Cents): Cents {
  if (!Number.isInteger(base) || !Number.isInteger(decrement)) {
    throw new TypeError('All amounts must be integers');
  }
  return base - decrement;
}

/**
 * Multiplies an integer cents amount by basis points with half-up rounding.
 * Example: multiplyBps(10000, 300) = 300 (3% of $100.00 is $3.00)
 */
export function multiplyBps(amount: Cents, bps: BasisPoints): Cents {
  if (!Number.isInteger(amount) || !Number.isInteger(bps)) {
    throw new TypeError('Amount and basis points must be integers');
  }
  return Math.round((amount * bps) / 10000);
}

/** Platform commission kept from every purchase. Internal: never sent to customers. */
export const PLATFORM_COMMISSION_BPS: BasisPoints = 300;

/** Share of the paid amount returned when a customer cancels inside the cancel window. */
export const CANCEL_REFUND_BPS: BasisPoints = 8000;

/** Hours after the payment is approved during which the customer may still cancel. */
export const CANCEL_WINDOW_HOURS = 6;

export interface PurchaseSplit {
  /** What the customer pays: always the full price. */
  amountCents: Cents;
  /** What the platform keeps. */
  commissionCents: Cents;
  /** What the workshop receives. */
  payoutCents: Cents;
}

/**
 * Splits a purchase between the platform and the workshop. The customer always pays the full
 * price; commission is rounded down so the workshop never gets less than its share.
 */
export function splitPurchase(totalPriceCents: Cents, commissionBps: BasisPoints = PLATFORM_COMMISSION_BPS): PurchaseSplit {
  if (!Number.isInteger(totalPriceCents) || totalPriceCents < 0) {
    throw new TypeError('Total price must be a non-negative integer');
  }
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10000) {
    throw new TypeError('Commission must be between 0 and 10000 basis points');
  }
  const commissionCents = Math.floor((totalPriceCents * commissionBps) / 10000);
  return { amountCents: totalPriceCents, commissionCents, payoutCents: totalPriceCents - commissionCents };
}

/** Refund for a purchase cancelled inside the window (rounded down, same as the database). */
export function cancelRefundCents(paidCents: Cents, refundBps: BasisPoints = CANCEL_REFUND_BPS): Cents {
  if (!Number.isInteger(paidCents) || paidCents < 0) throw new TypeError('Paid amount must be a non-negative integer');
  return Math.floor((paidCents * refundBps) / 10000);
}
