import { describe, it, expect } from 'vitest';
import { evaluateReferralReward } from './referrals';

describe('domain/referrals', () => {
  it('awards standard 8 credits for fresh referral', () => {
    const result = evaluateReferralReward({
      referrerFingerprint: 'device_abc_123',
      refereeFingerprint: 'device_xyz_999',
      referrerTotalRewardedCredits: 0,
    });

    expect(result.isEligible).toBe(true);
    expect(result.creditsToAward).toBe(8);
    expect(result.reason).toBe('ELIGIBLE');
  });

  it('blocks self-referral using same device fingerprint', () => {
    const result = evaluateReferralReward({
      referrerFingerprint: 'device_same_hash',
      refereeFingerprint: 'device_same_hash',
      referrerTotalRewardedCredits: 0,
    });

    expect(result.isEligible).toBe(false);
    expect(result.creditsToAward).toBe(0);
    expect(result.reason).toBe('SELF_REFERRAL_DETECTED');
  });

  it('respects 40-credit maximum cap', () => {
    // Already at 40 credits
    const cappedResult = evaluateReferralReward({
      referrerFingerprint: 'device_abc',
      refereeFingerprint: 'device_def',
      referrerTotalRewardedCredits: 40,
    });

    expect(cappedResult.isEligible).toBe(false);
    expect(cappedResult.creditsToAward).toBe(0);
    expect(cappedResult.reason).toBe('MAX_CAP_REACHED');

    // At 36 credits: awards only remaining 4 credits up to 40 cap
    const partialResult = evaluateReferralReward({
      referrerFingerprint: 'device_abc',
      refereeFingerprint: 'device_ghi',
      referrerTotalRewardedCredits: 36,
    });

    expect(partialResult.isEligible).toBe(true);
    expect(partialResult.creditsToAward).toBe(4);
  });
});
