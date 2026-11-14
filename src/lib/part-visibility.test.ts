import { describe, expect, it } from 'vitest';
import { isPartVisibleFromAngle, partZone, visibleParts } from './part-visibility';

const part = (category: string, name = 'x', zone?: string) => ({ category, name, zone });

describe('part visibility per camera angle', () => {
  it('paint work and wheels show from every angle', () => {
    for (const c of ['Color', 'Ceramic', 'Polish', 'Wheels']) {
      for (const a of ['front', 'rear', 'right', 'front-left', 'rear-right']) {
        expect(isPartVisibleFromAngle(part(c), a)).toBe(true);
      }
    }
  });

  it('a spoiler is not visible from the front', () => {
    expect(isPartVisibleFromAngle(part('Spoiler'), 'front')).toBe(false);
    expect(isPartVisibleFromAngle(part('Spoiler'), 'front-left')).toBe(false);
    expect(isPartVisibleFromAngle(part('Spoiler'), 'rear')).toBe(true);
    expect(isPartVisibleFromAngle(part('Spoiler'), 'right')).toBe(true);
  });

  it('rear lights show only from the rear, headlights only from the front', () => {
    const rear = part('Lights', 'Orqa fara LED');
    const front = part('Lights', 'Headlight kit');
    expect(isPartVisibleFromAngle(rear, 'front')).toBe(false);
    expect(isPartVisibleFromAngle(rear, 'rear-right')).toBe(true);
    expect(isPartVisibleFromAngle(front, 'rear')).toBe(false);
    expect(isPartVisibleFromAngle(front, 'front-left')).toBe(true);
  });

  it('an explicit zone beats the name; unclear parts stay visible everywhere', () => {
    expect(partZone(part('Bumper', 'Sport bumper', 'rear'))).toBe('rear');
    expect(partZone(part('Bumper', 'Front lip rear diffuser'))).toBe('both');
    expect(isPartVisibleFromAngle(part('Lights', 'LED kit'), 'front')).toBe(true);
    expect(isPartVisibleFromAngle(part('Lights', 'LED kit'), 'rear')).toBe(true);
  });

  it('the interior never shows from outside; unknown angles never hide anything', () => {
    expect(isPartVisibleFromAngle(part('Interior'), 'front')).toBe(false);
    expect(isPartVisibleFromAngle(part('Spoiler'), 'top-view')).toBe(true);
  });

  it('visibleParts keeps only what shows from the angle', () => {
    const parts = [part('Wheels', 'BBS'), part('Spoiler', 'Wing'), part('Color', 'Matte')];
    expect(visibleParts(parts, 'front').map((p) => p.name)).toEqual(['BBS', 'Matte']);
    expect(visibleParts(parts, 'rear')).toHaveLength(3);
  });
});

describe('window tint', () => {
  it('shows from every angle, unlike a Performance part', () => {
    for (const angle of ['front', 'front-left', 'right', 'rear', 'rear-right']) {
      expect(isPartVisibleFromAngle({ category: 'Tint', name: 'XPEL Prime XR 35% tonirovka' }, angle)).toBe(true);
    }
    expect(isPartVisibleFromAngle({ category: 'Performance', name: 'Exhaust' }, 'front')).toBe(false);
  });
});
