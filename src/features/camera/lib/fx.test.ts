import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('playTick haptics', () => {
  let now = 10_000;
  const vibrate = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vibrate.mockClear();
    now = 10_000;
    vi.stubGlobal('navigator', { vibrate });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('gives a soft tap you can feel on a slow notch', async () => {
    const { playTick } = await import('./fx');
    playTick();
    expect(vibrate).toHaveBeenCalledTimes(1);
    const ms = vibrate.mock.calls[0]![0] as number;
    expect(ms).toBeGreaterThanOrEqual(12);
    expect(ms).toBeLessThanOrEqual(20);
  });

  it('uses a lighter pulse when spinning fast', async () => {
    const { playTick } = await import('./fx');
    playTick();
    now += 70;
    playTick();
    expect(vibrate).toHaveBeenCalledTimes(2);
    expect(vibrate.mock.calls[1]![0] as number).toBeLessThan(vibrate.mock.calls[0]![0] as number);
  });

  it('never stacks pulses: notches closer than 50 ms share one', async () => {
    const { playTick } = await import('./fx');
    playTick();
    now += 30;
    playTick();
    expect(vibrate).toHaveBeenCalledTimes(1);
    now += 30;
    playTick();
    expect(vibrate).toHaveBeenCalledTimes(2);
  });
});
