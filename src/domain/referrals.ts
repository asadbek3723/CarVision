/**
 * CarVision Pure Domain Module: Referrals Engine
 * Calculates viral bonuses, rewards cap, and anti-fraud eligibility.
 */

export interface ReferralContext {
  referrerFingerprint?: string;
  refereeFingerprint: string;
  referrerTotalRewardedCredits: number;
  maxRewardCredits?: number; // Defaults to 40 credits
  rewardPerReferral?: number; // Defaults to 8 credits
}

export interface ReferralValidationResult {
  isEligible: boolean;
  creditsToAward: number;
  reason?: 'SELF_REFERRAL_DETECTED' | 'MAX_CAP_REACHED' | 'ELIGIBLE';
}

/**
 * Validates whether a referral qualifies for reward credits.
 */
export function evaluateReferralReward(context: ReferralContext): ReferralValidationResult {
  const maxCap = context.maxRewardCredits ?? 40;
  const rewardUnit = context.rewardPerReferral ?? 8;

  // Anti-fraud: same hardware fingerprint cannot self-refer
  if (
    context.referrerFingerprint &&
    context.referrerFingerprint.trim().length > 0 &&
    context.referrerFingerprint === context.refereeFingerprint
  ) {
    return {
      isEligible: false,
      creditsToAward: 0,
      reason: 'SELF_REFERRAL_DETECTED',
    };
  }

  // Cap check: user cannot exceed 40 total referral credits
  if (context.referrerTotalRewardedCredits >= maxCap) {
    return {
      isEligible: false,
      creditsToAward: 0,
      reason: 'MAX_CAP_REACHED',
    };
  }

  // Calculate actual reward (capped to not exceed maxCap)
  const availableSlots = maxCap - context.referrerTotalRewardedCredits;
  const creditsToAward = Math.min(rewardUnit, availableSlots);

  return {
    isEligible: true,
    creditsToAward,
    reason: 'ELIGIBLE',
  };
}
