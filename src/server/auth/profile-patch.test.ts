import { describe, expect, it } from 'vitest';
import { profilePatchSchema } from './profile-patch';

describe('profilePatchSchema', () => {
  it('accepts name, phone and e-mail together', () => {
    const r = profilePatchSchema.safeParse({ fullName: 'Ali Valiyev', phone: '+998 90 123 45 67', email: 'ali@example.com' });
    expect(r.success).toBe(true);
  });

  it('accepts removing the e-mail', () => {
    expect(profilePatchSchema.safeParse({ email: null }).success).toBe(true);
    expect(profilePatchSchema.safeParse({ email: '' }).success).toBe(true);
  });

  it('rejects malformed codes and unknown fields', () => {
    expect(profilePatchSchema.safeParse({ phone: '901234567', phoneCode: '12ab56' }).success).toBe(false);
    expect(profilePatchSchema.safeParse({ role: 'super_admin' }).success).toBe(false);
  });

  it('rejects a one-letter name', () => {
    expect(profilePatchSchema.safeParse({ fullName: 'A' }).success).toBe(false);
  });
});
