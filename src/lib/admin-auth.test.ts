import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyPinConstantTime,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinRateLimit,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from './admin-auth';

describe('Admin Security & PIN Authentication', () => {
  const testIp = '192.168.1.99';

  beforeEach(() => {
    clearPinRateLimit(testIp);
  });

  describe('verifyPinConstantTime', () => {
    it('should return true for the master pin 3723', () => {
      expect(verifyPinConstantTime('3723')).toBe(true);
    });

    it('should return false for incorrect pins', () => {
      expect(verifyPinConstantTime('1234')).toBe(false);
      expect(verifyPinConstantTime('0000')).toBe(false);
      expect(verifyPinConstantTime('3724')).toBe(false);
    });

    it('should return false for mismatched lengths or invalid inputs', () => {
      expect(verifyPinConstantTime('')).toBe(false);
      expect(verifyPinConstantTime('372')).toBe(false);
      expect(verifyPinConstantTime('37230')).toBe(false);
    });
  });

  describe('Rate Limiting & Brute-Force Protection', () => {
    it('should start with 5 allowed attempts', () => {
      const status = checkPinRateLimit(testIp);
      expect(status.allowed).toBe(true);
      expect(status.remainingAttempts).toBe(5);
    });

    it('should decrement remaining attempts upon recording failure', () => {
      const attempt1 = recordFailedPinAttempt(testIp);
      expect(attempt1.isLocked).toBe(false);
      expect(attempt1.remainingAttempts).toBe(4);

      const status = checkPinRateLimit(testIp);
      expect(status.remainingAttempts).toBe(4);
    });

    it('should lock out after 5 consecutive failures', () => {
      recordFailedPinAttempt(testIp);
      recordFailedPinAttempt(testIp);
      recordFailedPinAttempt(testIp);
      recordFailedPinAttempt(testIp);
      const attempt5 = recordFailedPinAttempt(testIp);

      expect(attempt5.isLocked).toBe(true);
      expect(attempt5.remainingAttempts).toBe(0);
      expect(attempt5.retryAfterSeconds).toBeGreaterThan(0);

      const status = checkPinRateLimit(testIp);
      expect(status.allowed).toBe(false);
    });

    it('should clear rate limit on success', () => {
      recordFailedPinAttempt(testIp);
      recordFailedPinAttempt(testIp);
      clearPinRateLimit(testIp);

      const status = checkPinRateLimit(testIp);
      expect(status.allowed).toBe(true);
      expect(status.remainingAttempts).toBe(5);
    });
  });

  describe('Admin Session Tokens (HMAC-SHA256)', () => {
    it('should create and verify a valid admin session token', () => {
      const token = createAdminSessionToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(verifyAdminSessionToken(token)).toBe(true);
    });

    it('should reject tampered or invalid tokens', () => {
      expect(verifyAdminSessionToken(undefined)).toBe(false);
      expect(verifyAdminSessionToken(null)).toBe(false);
      expect(verifyAdminSessionToken('')).toBe(false);
      expect(verifyAdminSessionToken('fake.token')).toBe(false);
      expect(verifyAdminSessionToken('123456789.badhash')).toBe(false);
    });
  });
});
