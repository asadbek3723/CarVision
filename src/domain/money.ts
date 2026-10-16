/**
 * CarVision Pure Domain Module: Money
 * Integer minor units math, rounding, and escrow calculations.
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

/**
 * Calculates the mandatory 3% escrow deposit with a minimum floor.
 * Default floor is 1000 cents ($10.00 / ~130,000 UZS).
 */
export function calculateDepositCents(totalPriceCents: Cents, minFloorCents: Cents = 1000): Cents {
  if (!Number.isInteger(totalPriceCents) || totalPriceCents < 0) {
    throw new TypeError('Total price must be a non-negative integer');
  }
  if (totalPriceCents === 0) return 0;

  const rawDeposit = multiplyBps(totalPriceCents, 300); // 300 bps = 3%
  return Math.max(rawDeposit, minFloorCents);
}
