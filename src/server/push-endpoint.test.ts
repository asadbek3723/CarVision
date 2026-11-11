import { describe, expect, it } from 'vitest';
import { isPushServiceEndpoint } from './push-endpoint';

describe('isPushServiceEndpoint', () => {
  it('accepts the browsers push services', () => {
    expect(isPushServiceEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushServiceEndpoint('https://web.push.apple.com/QGx')).toBe(true);
    expect(isPushServiceEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isPushServiceEndpoint('https://wns2-par02p.notify.windows.com/w/?token=1')).toBe(true);
  });

  it('rejects anything the server should never call', () => {
    expect(isPushServiceEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isPushServiceEndpoint('https://evil.example/fcm.googleapis.com')).toBe(false);
    expect(isPushServiceEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false);
    expect(isPushServiceEndpoint('https://push.apple.com.evil.example/x')).toBe(false);
    expect(isPushServiceEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isPushServiceEndpoint('https://user:pw@fcm.googleapis.com/x')).toBe(false);
    expect(isPushServiceEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isPushServiceEndpoint('not a url')).toBe(false);
  });
});
