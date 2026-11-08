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
      { id: 'l1', name: 'Side skirts', category: 'Body Kit' },
    ], 'https://cdn.test/hero.jpg');
    expect(body.angleId).toBe('rear');
    expect(body.partName).toBe('BBS + Side skirts');
    expect(body.parts).toHaveLength(2);
    expect(body.referenceAfterUrl).toBe('https://cdn.test/hero.jpg');
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect('referenceAfterUrl' in toRequestBody({ id: 'a', label: 'a', photo: 'x' }, [{ id: 'p', name: 'P' }])).toBe(false);
  });
});

describe('render plan with part visibility', () => {
  const photo = 'data:image/jpeg;base64,AAAAAA';
  const front = ang('front', photo);
  const rear = ang('rear', photo);
  const frontLeft = ang('front-left', photo);
  const spoiler = { id: 's', category: 'Spoiler', name: 'Wing' };
  const wheels = { id: 'w', category: 'Wheels', name: 'BBS' };

  it('skips angles that cannot show any chosen part and charges nothing for them', () => {
    const plan = planRender([front, rear, frontLeft], [spoiler]);
    expect(plan.order.map((a) => a.id)).toEqual(['rear']);
    expect(plan.skipped.map((a) => a.id).sort()).toEqual(['front', 'front-left']);
    expect(plan.creditsNeeded).toBe(1);
    expect(plan.noneVisible).toBe(false);
  });

  it('renders every angle for parts visible everywhere', () => {
    const plan = planRender([front, rear, frontLeft], [wheels, spoiler]);
    expect(plan.order).toHaveLength(3);
    expect(plan.skipped).toHaveLength(0);
    expect(plan.creditsNeeded).toBe(3);
  });

  it('flags parts no photographed angle can show, and blocks when nothing is visible', () => {
    const onlyFront = planRender([front], [spoiler]);
    expect(onlyFront.noneVisible).toBe(true);
    expect(onlyFront.creditsNeeded).toBe(0);
    expect(onlyFront.hiddenPartIds).toEqual(['s']);

    const mixed = planRender([front], [spoiler, wheels]);
    expect(mixed.noneVisible).toBe(false);
    expect(mixed.hiddenPartIds).toEqual(['s']);
    expect(mixed.order.map((a) => a.id)).toEqual(['front']);
  });

  it('without parts it behaves as before', () => {
    expect(planRender([front, rear]).creditsNeeded).toBe(2);
    expect(planRender([]).noneVisible).toBe(false);
  });

  it('the request body only carries parts visible from that angle', () => {
    const body = toRequestBody({ id: 'front', label: 'Old', photo }, [
      { id: 'w', name: 'BBS', category: 'Wheels' },
      { id: 's', name: 'Wing', category: 'Spoiler' },
    ]);
    expect(body.parts.map((p) => p.id)).toEqual(['w']);
    expect(body.partName).toBe('BBS');
  });
});
