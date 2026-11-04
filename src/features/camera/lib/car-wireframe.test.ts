import { describe, it, expect } from 'vitest';
import { projectGhost, makeCamera, GHOST_VIEWBOX } from './car-wireframe';

describe('ghost car projection', () => {
  it('keeps every angle inside the viewBox', () => {
    for (const bearing of [0, 90, 135, 180, 315]) {
      const g = projectGhost(bearing);
      const nums = g.body.flatMap((b) => b.d.match(/-?\d+\.\d/g)!.map(Number));
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...nums)).toBeLessThanOrEqual(GHOST_VIEWBOX.width);
    }
  });

  it('shows the long side from the side and the narrow end from front/rear', () => {
    const spanX = (bearing: number) => {
      const xs = projectGhost(bearing, 1).body.flatMap((b) => [...b.d.matchAll(/[ML](-?\d+\.\d) /g)].map((m) => Number(m[1])));
      return Math.max(...xs) - Math.min(...xs);
    };
    const spanY = (bearing: number) => {
      const ys = projectGhost(bearing, 1).body.flatMap((b) => [...b.d.matchAll(/ (-?\d+\.\d)/g)].map((m) => Number(m[1])));
      return Math.max(...ys) - Math.min(...ys);
    };
    // Aspect ratio (width / height) is largest in profile, smallest head-on.
    expect(spanX(90) / spanY(90)).toBeGreaterThan(spanX(0) / spanY(0));
    expect(spanX(90) / spanY(90)).toBeGreaterThan(spanX(180) / spanY(180));
  });

  it('puts the front on the screen-left when seen from the right side (car faces right→front is +z)', () => {
    // From the car's right side the front of the car is on the viewer's right.
    const cam = makeCamera(90);
    const front = cam.project([0, 0.5, 2]);
    const rear = cam.project([0, 0.5, -2]);
    expect(front.x).toBeGreaterThan(rear.x);
  });

  it('shows the car\'s right side on the viewer\'s left when facing the car from the front', () => {
    const cam = makeCamera(0);
    expect(cam.project([1, 0.5, 0]).x).toBeLessThan(cam.project([-1, 0.5, 0]).x);
  });

  it('keeps up as up', () => {
    const cam = makeCamera(135);
    expect(cam.project([0, 1.4, 0]).y).toBeLessThan(cam.project([0, 0.2, 0]).y);
  });
});
