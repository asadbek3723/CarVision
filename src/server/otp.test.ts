import { describe, expect, it } from 'vitest';
import { otpHashInput } from './otp';

describe('otpHashInput', () => {
  it('keeps the registration form unchanged', () => {
    expect(otpHashInput('+998901234567', '123456', 'register')).toBe('+998901234567:123456');
  });

  it('binds change codes to their purpose so one flow cannot reuse another flow’s code', () => {
    const phone = otpHashInput('+998901234567', '123456', 'change_phone');
    const email = otpHashInput('+998901234567', '123456', 'change_email');
    expect(phone).not.toBe(email);
    expect(phone).not.toBe(otpHashInput('+998901234567', '123456', 'register'));
  });
});
