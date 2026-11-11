import { describe, expect, it } from 'vitest';
import { TRIAL_LIMITS, trialAllowed } from './trial-guard';

describe('trialAllowed', () => {
  it('grants until the network or the device reached its limit', () => {
    expect(trialAllowed(0, 0, false)).toBe(true);
    expect(trialAllowed(TRIAL_LIMITS.perIp - 1, TRIAL_LIMITS.perDevice - 1, false)).toBe(true);
    expect(trialAllowed(TRIAL_LIMITS.perIp, 0, false)).toBe(false);
    expect(trialAllowed(0, TRIAL_LIMITS.perDevice, false)).toBe(false);
  });

  it('allows more people per network when the CAPTCHA is on, never more per device', () => {
    expect(trialAllowed(TRIAL_LIMITS.perIp, 0, true)).toBe(true);
    expect(trialAllowed(TRIAL_LIMITS.perIpWithCaptcha, 0, true)).toBe(false);
    expect(trialAllowed(0, TRIAL_LIMITS.perDevice, true)).toBe(false);
  });
});
