import crypto from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { turnstileRequired } from '@/server/turnstile';

/**
 * Free sign-up credits without SMS verification are a target for "credit farming" (one person,
 * many accounts). Sign-up itself is never refused here (mobile carriers put many people behind one
 * IP), only the free credits are held back once a network or a device has already received them a
 * few times. Held-back credits are released when the phone is verified (claim_monthly_credits).
 */
export const DEVICE_COOKIE = 'cv_dev';
const DEVICE_MAX_AGE_S = 60 * 60 * 24 * 365;
const DEVICE_ID = /^[0-9a-f]{32}$/;

export const TRIAL_LIMITS = {
  /** Grants per network per day. Bots are stopped by Turnstile when it is on, so the limit can be
   *  looser for real people sharing a carrier IP. */
  perIp: 3,
  perIpWithCaptcha: 10,
  ipWindowMs: 24 * 60 * 60 * 1000,
  perDevice: 2,
  deviceWindowMs: 30 * 24 * 60 * 60 * 1000,
} as const;

const KIND = 'trial_grant';

/** The device id from the cookie, or a new one (set it on the response with setDeviceCookie). */
export function deviceIdOf(request: NextRequest): { id: string; fresh: boolean } {
  const raw = request.cookies.get(DEVICE_COOKIE)?.value ?? '';
  if (DEVICE_ID.test(raw)) return { id: raw, fresh: false };
  return { id: crypto.randomBytes(16).toString('hex'), fresh: true };
}

export function setDeviceCookie(response: NextResponse, id: string): void {
  response.cookies.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_MAX_AGE_S,
  });
}

/** Pure decision, unit-tested. */
export function trialAllowed(grantsFromIp: number, grantsFromDevice: number, captchaOn: boolean): boolean {
  const ipLimit = captchaOn ? TRIAL_LIMITS.perIpWithCaptcha : TRIAL_LIMITS.perIp;
  return grantsFromIp < ipLimit && grantsFromDevice < TRIAL_LIMITS.perDevice;
}

export async function shouldWithholdTrial(ip: string, deviceId: string): Promise<boolean> {
  const [fromIp, fromDevice] = await Promise.all([
    recentFailures('ip', ip, KIND, TRIAL_LIMITS.ipWindowMs, true),
    recentFailures('login_key', `dev:${deviceId}`, KIND, TRIAL_LIMITS.deviceWindowMs, true),
  ]);
  return !trialAllowed(fromIp, fromDevice, turnstileRequired());
}

export async function recordTrialGrant(ip: string, deviceId: string): Promise<void> {
  await recordAttempt(KIND, `dev:${deviceId}`, ip, true);
}
