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
  /** Relative line weight (rings and wheels read stronger than long lines). */
  weight: number;
}

let cachedSegments: Segment3[] | null = null;

/** All 3D segments of the ghost car (built once). */
export function buildCarSegments(): Segment3[] {
  if (cachedSegments) return cachedSegments;
  const segs: Segment3[] = [];
  const push = (a: Vec3, b: Vec3, weight: number) => segs.push({ a, b, weight });
  const stations = smoothStations();
  const sections = stations.map((st) => section(st).map(([x, y]) => [x, y, st[0]!] as Vec3));

  // Longitudinal lines (the 6 section points, front → back).
  for (let p = 0; p < 6; p++) {
    for (let i = 0; i < sections.length - 1; i++) {
      push(sections[i]![p]!, sections[i + 1]![p]!, p === 1 || p === 4 ? 1.25 : 1);
    }
  }
  // Cross-section rings at every other key station only (more reads as clutter head-on).
  for (let i = 0; i < sections.length; i += SUBDIVISIONS * 2) {
    const ring = sections[i]!;
    for (let p = 0; p < ring.length; p++) {
      push(ring[p]!, ring[(p + 1) % ring.length]!, 1.1);
    }
  }
  // Wheels: tyre + rim on both sides.
  for (const z of WHEEL_Z) {
    for (const side of [-1, 1]) {
      for (const [r, wgt] of [
        [WHEEL_RADIUS, 1.35],
        [WHEEL_RADIUS * 0.58, 0.9],
      ] as const) {
        const n = 28;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2;
          const a1 = ((i + 1) / n) * Math.PI * 2;
          push(
            [side * WHEEL_X, WHEEL_RADIUS + Math.sin(a0) * r, z + Math.cos(a0) * r],
            [side * WHEEL_X, WHEEL_RADIUS + Math.sin(a1) * r, z + Math.cos(a1) * r],
            wgt
          );
        }
      }
    }
  }
  // Head- and tail-lamps.
  for (const [z, y] of [
    [2.29, 0.5],
    [-2.24, 0.62],
  ] as const) {
    for (const side of [-1, 1]) {
      push([side * 0.28, y, z], [side * 0.7, y + 0.04, z], 1.6);
    }
  }
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

const DEPTH_BUCKETS = 5;

/**
 * Projects the ghost car for a bearing and fits it to the viewBox (the car always fills the same
 * share of the frame, matching the 72–85 % viewport coverage the capture guide asks for).
 */
export function projectGhost(bearing: number, fill = 0.8): GhostWireframe {
  const { width, height } = GHOST_VIEWBOX;
  const cam = makeCamera(bearing);
  const segs = buildCarSegments();
  const proj = segs.map((s) => ({ a: cam.project(s.a), b: cam.project(s.b), weight: s.weight }));

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

  const buckets: string[][] = Array.from({ length: DEPTH_BUCKETS }, () => []);
  for (const s of proj) {
    const mid = (s.a.depth + s.b.depth) / 2;
    const near = 1 - (mid - minD) / (maxD - minD || 1); // 1 = nearest
    const bi = Math.min(DEPTH_BUCKETS - 1, Math.floor(near * DEPTH_BUCKETS));
    const a = toSvg(s.a);
    const b = toSvg(s.b);
    buckets[bi]!.push(`M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`);
  }
  const body: GhostPath[] = buckets
    .map((segsInBucket, i) => ({
      d: segsInBucket.join(''),
      opacity: 0.07 + Math.pow(i / (DEPTH_BUCKETS - 1), 1.6) * 0.88,
    }))
    .filter((b) => b.d.length > 0);

  const gp = groundContour().map((p) => toSvg(cam.project(p)));
  const ground = gp.map((p, i) => `${i === 0 ? 'M' : 'L'}${fmt(p.x)} ${fmt(p.y)}`).join('') + 'Z';

  return { width, height, body, ground };
}
