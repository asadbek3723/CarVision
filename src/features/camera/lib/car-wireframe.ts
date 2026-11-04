/**
 * Dependency-free 3D "ghost" car for the Smart Camera.
 *
 * One low-poly car (cross-section rings + smooth longitudinal lines + wheels + lamps) is projected
 * with a real perspective camera that orbits the car at the bearing of the requested angle, so the
 * outline the user aligns with is geometrically correct for every one of the 5 shots.
 *
 * Car frame: x = car's right, y = up, z = forward (metres).
 * Bearing: degrees clockwise seen from above, 0 = camera in front of the car, 90 = at its right side.
 */

type Vec3 = readonly [number, number, number];

export interface GhostPath {
  /** SVG path data (all segments of one depth bucket). */
  d: string;
  /** 0..1 stroke opacity, brighter for parts nearer to the camera. */
  opacity: number;
}

export interface GhostWireframe {
  width: number;
  height: number;
  /** Body + wheels + lamps, bucketed by depth (far → near). */
  body: GhostPath[];
  /** Ground contour the car "parks" in. */
  ground: string;
}

export const GHOST_VIEWBOX = { width: 800, height: 400 } as const;

/** Key stations along the car: z, half-width, belt line y, roof y, roof half-width, sill y. */
const STATIONS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [2.3, 0.66, 0.56, 0.58, 0.58, 0.4],
  [2.12, 0.86, 0.68, 0.7, 0.78, 0.3],
  [1.7, 0.92, 0.8, 0.84, 0.86, 0.26],
  [1.05, 0.93, 0.93, 0.96, 0.88, 0.26],
  [0.55, 0.93, 0.97, 1.28, 0.7, 0.26],
  [-0.3, 0.93, 1.0, 1.46, 0.66, 0.26],
  [-1.1, 0.93, 1.0, 1.43, 0.65, 0.26],
  [-1.85, 0.91, 0.98, 1.22, 0.72, 0.28],
  [-2.25, 0.84, 0.94, 0.96, 0.8, 0.38],
];

const SUBDIVISIONS = 4;
const WHEEL_RADIUS = 0.37;
const WHEEL_Z: readonly number[] = [1.45, -1.4];
const WHEEL_X = 0.94;

/** Catmull-Rom interpolation between p1 and p2. */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Smooth station table: each key station followed by SUBDIVISIONS interpolated ones. */
function smoothStations(): number[][] {
  const out: number[][] = [];
  const last = STATIONS.length - 1;
  for (let i = 0; i < last; i++) {
    const p0 = STATIONS[Math.max(0, i - 1)]!;
    const p1 = STATIONS[i]!;
    const p2 = STATIONS[i + 1]!;
    const p3 = STATIONS[Math.min(last, i + 2)]!;
    for (let s = 0; s < SUBDIVISIONS; s++) {
      const t = s / SUBDIVISIONS;
      out.push(p1.map((_, k) => catmull(p0[k]!, p1[k]!, p2[k]!, p3[k]!, t)));
    }
  }
  out.push([...STATIONS[last]!]);
  return out;
}

/** The 6 cross-section points (x, y) of one station, left sill → roof → right sill. */
function section(st: number[]): Array<[number, number]> {
  const [, w, belt, roof, wr, sill] = st as [number, number, number, number, number, number];
  return [
    [-w, sill],
    [-w, belt],
    [-wr, roof],
    [wr, roof],
    [w, belt],
    [w, sill],
  ];
}

interface Segment3 {
  a: Vec3;
  b: Vec3;
  /** Relative line weight (long body lines read calmer than lamps and glass). */
  weight: number;
  /**
   * Outward normal of the car face this line is drawn on. Lines on a face that looks at the camera
   * are drawn brighter, so the side to shoot reads at a glance. Omitted = neutral body line.
   */
  n?: Vec3 | undefined;
}

let cachedSegments: Segment3[] | null = null;
let cachedTable: number[][] | null = null;

function table(): number[][] {
  return (cachedTable ??= smoothStations());
}

/** Station values (z, half-width, belt, roof, roof half-width, sill) at any z, linearly interpolated. */
function stationAt(z: number): [number, number, number, number, number, number] {
  const t = table();
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i]!;
    const b = t[i + 1]!;
    if (z <= a[0]! && z >= b[0]!) {
      const k = (a[0]! - z) / (a[0]! - b[0]! || 1);
      return a.map((v, j) => v + (b[j]! - v) * k) as [number, number, number, number, number, number];
    }
  }
  const e = z > t[0]![0]! ? t[0]! : t[t.length - 1]!;
  return [...e] as [number, number, number, number, number, number];
}

/** Point on the side of the body at z, `k` = 0 at the belt line … 1 at the roof edge. */
function sidePoint(side: number, z: number, k: number): Vec3 {
  const [, w, belt, roof, wr] = stationAt(z);
  return [side * (w + (wr - w) * k), belt + (roof - belt) * k, z];
}

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** All 3D segments of the ghost car (built once). */
export function buildCarSegments(): Segment3[] {
  if (cachedSegments) return cachedSegments;
  const segs: Segment3[] = [];
  const line = (a: Vec3, b: Vec3, weight = 1, n?: Vec3) => segs.push({ a, b, weight, n });
  const poly = (pts: Vec3[], closed: boolean, weight: number, n?: Vec3) => {
    const last = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < last; i++) line(pts[i]!, pts[(i + 1) % pts.length]!, weight, n);
  };
  const stations = table();
  const sections = stations.map((st) => section(st).map(([x, y]) => [x, y, st[0]!] as Vec3));

  const FRONT: Vec3 = [0, 0, 1];
  const REAR: Vec3 = [0, 0, -1];

  // Body silhouette: sills, belt lines and roof edges, front → back.
  for (let p = 0; p < 6; p++) {
    for (let i = 0; i < sections.length - 1; i++) {
      line(sections[i]![p]!, sections[i + 1]![p]!, p === 1 || p === 4 ? 1.15 : 1);
    }
  }
  // Nose and tail outlines (head-on views show a clear face, no cross-section clutter).
  poly(sections[0]!, true, 1.1, FRONT);
  poly(sections[sections.length - 1]!, true, 1.1, REAR);

  const zs = (from: number, to: number, n: number) =>
    Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);

  // Bonnet creases + roof panel.
  for (const x of [-0.5, 0, 0.5]) {
    poly(zs(2.1, 1.08, 6).map((z) => [x, stationAt(z)[3] + 0.005, z] as Vec3), false, 0.7, unit([0, 1, 0.35]));
  }
  for (const x of [-0.4, 0.4]) {
    poly(zs(0.2, -1.35, 8).map((z) => [x, stationAt(z)[3] + 0.005, z] as Vec3), false, 0.6, [0, 1, 0]);
  }

  // Windscreen and rear screen.
  const glass = (z1: number, z2: number, n: Vec3) => {
    const a = stationAt(z1);
    const b = stationAt(z2);
    poly(
      [
        [-(a[4] - 0.02), a[3] - 0.01, z1],
        [a[4] - 0.02, a[3] - 0.01, z1],
        [b[4] - 0.02, b[3] - 0.01, z2],
        [-(b[4] - 0.02), b[3] - 0.01, z2],
      ],
      true,
      0.9,
      n
    );
  };
  glass(1.02, 0.6, unit([0, 0.55, 0.85]));
  glass(-1.4, -1.9, unit([0, 0.55, -0.85]));

  for (const s of [-1, 1] as const) {
    const side: Vec3 = [s, 0, 0];
    // Side glass + pillars.
    const lower = zs(0.74, -1.78, 10).map((z) => sidePoint(s, z, 0.1));
    const upper = zs(0.74, -1.78, 10).map((z) => sidePoint(s, z, 0.9));
    poly(lower, false, 0.9, side);
    poly(upper, false, 0.9, side);
    line(lower[0]!, upper[0]!, 0.9, side);
    line(lower[lower.length - 1]!, upper[upper.length - 1]!, 0.9, side);
    line(sidePoint(s, -0.32, 0.1), sidePoint(s, -0.32, 0.9), 0.9, side); // B-pillar
    // Door shut lines, handles and the character line along the flank.
    for (const z of [0.78, -0.32, -1.4]) {
      const [, w, , , , sill] = stationAt(z);
      line([s * w, sill + 0.05, z], sidePoint(s, z, 0.1), 0.8, side);
    }
    for (const z of [0.1, -0.95]) {
      const [, w, belt] = stationAt(z);
      line([s * w, belt - 0.1, z - 0.13], [s * w, belt - 0.1, z + 0.13], 1, side);
    }
    poly(
      zs(1.95, -2.0, 12).map((z) => {
        const [, w, belt, , , sill] = stationAt(z);
        return [s * w, sill + (belt - sill) * 0.42, z] as Vec3;
      }),
      false,
      0.8,
      side
    );
    // Wing mirror.
    const [, mw, mb] = stationAt(0.82);
    poly(
      [
        [s * (mw + 0.02), mb + 0.1, 0.9],
        [s * (mw + 0.2), mb + 0.13, 0.84],
        [s * (mw + 0.2), mb + 0.25, 0.84],
        [s * (mw + 0.02), mb + 0.22, 0.9],
      ],
      true,
      0.9,
      unit([s, 0, 0.5])
    );
    // Wheels: arch, tyre and rim.
    for (const z of WHEEL_Z) {
      const arch: Vec3[] = [];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        arch.push([s * WHEEL_X, WHEEL_RADIUS + Math.sin(a) * (WHEEL_RADIUS + 0.1), z + Math.cos(a) * (WHEEL_RADIUS + 0.1)]);
      }
      poly(arch, false, 0.9, side);
      for (const [r, wgt] of [
        [WHEEL_RADIUS, 1.2],
        [WHEEL_RADIUS * 0.6, 0.8],
      ] as const) {
        const ring: Vec3[] = [];
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2;
          ring.push([s * WHEEL_X, WHEEL_RADIUS + Math.sin(a) * r, z + Math.cos(a) * r]);
        }
        poly(ring, true, wgt, side);
      }
    }
    // Head-lamp, tail-lamp.
    poly(
      [
        [s * 0.34, 0.5, 2.27],
        [s * 0.76, 0.52, 2.13],
        [s * 0.8, 0.64, 2.1],
        [s * 0.36, 0.6, 2.26],
      ],
      true,
      1.3,
      unit([s * 0.25, 0, 1])
    );
    poly(
      [
        [s * 0.36, 0.64, -2.23],
        [s * 0.78, 0.66, -2.12],
        [s * 0.8, 0.78, -2.1],
        [s * 0.38, 0.76, -2.22],
      ],
      true,
      1.3,
      unit([s * 0.25, 0, -1])
    );
  }

  // Grille + number plates + light bar.
  poly(
    [
      [-0.26, 0.4, 2.3],
      [0.26, 0.4, 2.3],
      [0.26, 0.52, 2.3],
      [-0.26, 0.52, 2.3],
    ],
    true,
    1,
    FRONT
  );
  line([-0.3, 0.46, 2.3], [0.3, 0.46, 2.3], 0.6, FRONT);
  poly(
    [
      [-0.24, 0.46, -2.26],
      [0.24, 0.46, -2.26],
      [0.24, 0.58, -2.26],
      [-0.24, 0.58, -2.26],
    ],
    true,
    1,
    REAR
  );
  line([-0.36, 0.7, -2.23], [0.36, 0.7, -2.23], 0.9, REAR);

  cachedSegments = segs;
  return segs;
}

/** Rounded-rectangle ground contour around the car (y = 0). */
function groundContour(): Vec3[] {
  const hx = 1.25;
  const hz = 2.75;
  const r = 0.55;
  const pts: Vec3[] = [];
  const corner = (cx: number, cz: number, from: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = from + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r]);
    }
  };
  corner(hx - r, hz - r, 0);
  corner(-(hx - r), hz - r, Math.PI / 2);
  corner(-(hx - r), -(hz - r), Math.PI);
  corner(hx - r, -(hz - r), Math.PI * 1.5);
  pts.push(pts[0]!);
  return pts;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

/** Camera orbiting the car at `bearing`, looking at the car's centre from slightly above. */
export function makeCamera(bearing: number, distance = 12, height = 1.6) {
  const th = (bearing * Math.PI) / 180;
  const pos: Vec3 = [Math.sin(th) * distance, height, Math.cos(th) * distance];
  const target: Vec3 = [0, 0.75, 0];
  const f = norm(sub(target, pos));
  const r = norm([-Math.cos(th), 0, Math.sin(th)]);
  let u = norm(cross(r, f));
  if (u[1] < 0) u = [-u[0], -u[1], -u[2]];
  return {
    project(p: Vec3): ProjectedPoint {
      const rel = sub(p, pos);
      const depth = dot(rel, f);
      return { x: dot(rel, r) / depth, y: -dot(rel, u) / depth, depth };
    },
  };
}

/** Opacity steps: segments are grouped into one SVG path per step. */
const OPACITY_STEP = 0.04;

/** Brightness of one line: calm body lines by depth, lines on a face that looks at the camera lift clearly. */
function lineOpacity(near: number, facing: number | null, weight: number): number {
  if (facing === null) return 0.16 + 0.26 * near;
  if (facing <= 0.04) return 0.07;
  return Math.min(0.8, 0.2 + 0.6 * Math.pow(facing, 0.6) * (0.65 + 0.35 * near) * (0.85 + 0.15 * weight));
}

/**
 * Projects the ghost car for a bearing and fits it to the viewBox (the car always fills the same
 * share of the frame, matching the 72–85 % viewport coverage the capture guide asks for).
 * Lines on the faces that look at the camera (front, right side, …) are drawn brightest.
 */
export function projectGhost(bearing: number, fill = 0.8): GhostWireframe {
  const { width, height } = GHOST_VIEWBOX;
  const cam = makeCamera(bearing);
  const segs = buildCarSegments();
  const proj = segs.map((s) => ({ a: cam.project(s.a), b: cam.project(s.b), weight: s.weight, n: s.n }));

  // Unit vector from the car's centre towards the camera.
  const th = (bearing * Math.PI) / 180;
  const toCam = norm([Math.sin(th) * 12, 1.6 - 0.75, Math.cos(th) * 12]);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minD = Infinity;
  let maxD = -Infinity;
  for (const s of proj) {
    for (const p of [s.a, s.b]) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      minD = Math.min(minD, p.depth);
      maxD = Math.max(maxD, p.depth);
    }
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width * fill) / spanX, (height * 0.86) / spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const toSvg = (p: ProjectedPoint) => ({
    x: width / 2 + (p.x - cx) * scale,
    y: height / 2 + (p.y - cy) * scale,
  });
  const fmt = (n: number) => n.toFixed(1);

  const groups = new Map<number, string[]>();
  for (const s of proj) {
    const mid = (s.a.depth + s.b.depth) / 2;
    const near = 1 - (mid - minD) / (maxD - minD || 1); // 1 = nearest
    const facing = s.n ? dot(s.n, toCam) : null;
    const step = Math.round(lineOpacity(near, facing, s.weight) / OPACITY_STEP);
    const a = toSvg(s.a);
    const b = toSvg(s.b);
    const list = groups.get(step) ?? [];
    list.push(`M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`);
    groups.set(step, list);
  }
  // Far/hidden lines first, bright ones on top.
  const body: GhostPath[] = [...groups.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([step, list]) => ({ d: list.join(''), opacity: step * OPACITY_STEP }));

  const gp = groundContour().map((p) => toSvg(cam.project(p)));
  const ground = gp.map((p, i) => `${i === 0 ? 'M' : 'L'}${fmt(p.x)} ${fmt(p.y)}`).join('') + 'Z';

  return { width, height, body, ground };
}
