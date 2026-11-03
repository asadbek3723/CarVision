import { describe, it, expect } from 'vitest';
import { CREDITS_PER_ANGLE, heroAngleId, planRender, summarize, usableReference } from './render-plan';

const ang = (id: string, photo?: string) => ({ id, label: id, photo });

describe('render plan', () => {
  it('prices exactly one credit per captured angle', () => {
    const plan = planRender([ang('front', 'data:image/jpeg;base64,AAAAAA'), ang('front-left', 'https://x.test/a.jpg'), ang('rear'), ang('right', '')]);
    expect(plan.order.map((a) => a.id)).toEqual(['front-left', 'front']);
    expect(plan.creditsNeeded).toBe(2 * CREDITS_PER_ANGLE);
  });

  it('puts the best 3/4 view first and handles missing heroes', () => {
    expect(heroAngleId([ang('rear', 'data:image/jpeg;base64,AAAAAA'), ang('front-left', 'data:image/jpeg;base64,AAAAAA')])).toBe('front-left');
    expect(heroAngleId([ang('right', 'data:image/jpeg;base64,AAAAAA')])).toBe('right');
    expect(heroAngleId([ang('front')])).toBeNull();
    expect(planRender([]).creditsNeeded).toBe(0);
  });

  it('summarises progress', () => {
    const s = summarize([
      { id: 'a', label: 'a', status: 'done' },
      { id: 'b', label: 'b', status: 'failed' },
      { id: 'c', label: 'c', status: 'rendering' },
      { id: 'd', label: 'd', status: 'queued' },
    ]);
    expect(s).toEqual({ done: 1, failed: 1, total: 4, percent: 50 });
  });

  it('only forwards https results as a reference', () => {
    expect(usableReference('https://cdn.test/x.jpg')).toBe('https://cdn.test/x.jpg');
    expect(usableReference('data:image/jpeg;base64,AAAA')).toBeUndefined();
    expect(usableReference(undefined)).toBeUndefined();
  });
});

import { toRequestBody } from './useRenderBuild';

describe('request body', () => {
  it('carries the angle, all parts and an optional same-build reference', () => {
    // crypto.randomUUID exists in the vitest node environment
    const body = toRequestBody({ id: 'rear', label: 'Orqa', photo: 'data:image/jpeg;base64,AAAAAA' }, [
      { id: 'w1', name: 'BBS', category: 'Wheels', price: 400 },
      { id: 'l1', name: 'Lip', category: 'Body Kit' },
    ], 'https://cdn.test/hero.jpg');
    expect(body.angleId).toBe('rear');
    expect(body.partName).toBe('BBS + Lip');
    expect(body.parts).toHaveLength(2);
    expect(body.referenceAfterUrl).toBe('https://cdn.test/hero.jpg');
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect('referenceAfterUrl' in toRequestBody({ id: 'a', label: 'a', photo: 'x' }, [{ id: 'p', name: 'P' }])).toBe(false);
  });
});
