import { describe, expect, it } from 'vitest';
import { carCheckRequired, signCarCheck, verifyCarCheck } from './car-check';

const env = { CAR_CHECK_SECRET: 'a-long-enough-secret-123' } as unknown as NodeJS.ProcessEnv;
const none = {} as NodeJS.ProcessEnv;

describe('car check token', () => {
  it('is not enforced (and never issued) without a secret', () => {
    expect(carCheckRequired(none)).toBe(false);
    expect(signCarCheck('u1', 1000, none)).toBeNull();
    expect(verifyCarCheck(undefined, 'u1', 1000, none)).toBe(true);
  });

  it('accepts a fresh token of the same user', () => {
    const token = signCarCheck('u1', 1000, env)!;
    expect(carCheckRequired(env)).toBe(true);
    expect(verifyCarCheck(token, 'u1', 2000, env)).toBe(true);
  });

  it('rejects missing, expired, forged and other-user tokens', () => {
    const token = signCarCheck('u1', 1000, env)!;
    expect(verifyCarCheck(undefined, 'u1', 2000, env)).toBe(false);
    expect(verifyCarCheck(token, 'u2', 2000, env)).toBe(false);
    expect(verifyCarCheck(token, 'u1', 1000 + 7 * 60 * 60 * 1000, env)).toBe(false);
    const [exp] = token.split('.');
    expect(verifyCarCheck(`${exp}.forged`, 'u1', 2000, env)).toBe(false);
    expect(verifyCarCheck('garbage', 'u1', 2000, env)).toBe(false);
  });
});
