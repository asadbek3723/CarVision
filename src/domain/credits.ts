/**
 * CarVision Pure Domain Module: Credits Management
 * Evaluates balance thresholds, FOMO warnings, and deduction states.
 */

export interface CreditAccount {
  balance: number;
  monthlyQuota: number;
  fomoWarningThreshold?: number; // Defaults to 10% of monthly quota or 16 credits
}

export type CreditAction = 'ALLOW' | 'SHOW_WARNING' | 'BLOCK_UPGRADE_REQUIRED';

/**
 * Evaluates whether an action can proceed based on credits balance.
 */
export function evaluateCreditStatus(account: CreditAccount): CreditAction {
  if (account.balance <= 0) {
    return 'BLOCK_UPGRADE_REQUIRED';
  }

  const threshold = account.fomoWarningThreshold ?? Math.max(16, Math.round(account.monthlyQuota * 0.1));

  if (account.balance <= threshold) {
    return 'SHOW_WARNING';
  }

  return 'ALLOW';
}

/**
 * Calculates remaining balance after decrement, preventing negative balances.
 */
export function deductCreditBalance(currentBalance: number, amount: number = 1): number {
  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new TypeError('Deduction amount must be a positive integer');
  }
  if (currentBalance < amount) {
    throw new Error('Insufficient credits balance');
  }
  return currentBalance - amount;
}
