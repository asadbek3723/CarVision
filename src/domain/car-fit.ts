/**
 * How a catalog item fits the customer's car ("My car"), and how a wheel compares with the car's
 * factory wheel. Pure functions: no I/O, safe on server and client.
 */

export interface FitCar {
  modelId: string;
  label: string;
  year?: number | undefined;
}

export interface FitProduct {
  isUniversal?: boolean | undefined;
  compatibility?: Array<{ id: string; yearFrom?: number | null | undefined; yearTo?: number | null | undefined }> | undefined;
}

/** `exact` — the workshop listed this car (and year); `universal` — fits every car; `null` — no claim. */
export type CarFit = 'exact' | 'universal' | null;

export function carFit(product: FitProduct, car: FitCar | null | undefined): CarFit {
  if (!car) return null;
  if (product.isUniversal) return 'universal';
  const year = car.year;
  const listed = (product.compatibility ?? []).some(
    (c) =>
      c.id === car.modelId &&
      (!year || ((c.yearFrom === null || c.yearFrom === undefined || year >= c.yearFrom) && (c.yearTo === null || c.yearTo === undefined || year <= c.yearTo)))
  );
  return listed ? 'exact' : null;
}

/** Counts of the shop list for one car: parts listed for it and universal services. */
export function fitSummary(products: FitProduct[], car: FitCar | null | undefined): { parts: number; services: number } {
  let parts = 0;
  let services = 0;
  for (const p of products) {
    const fit = carFit(p, car);
    if (fit === 'exact') parts += 1;
    else if (fit === 'universal') services += 1;
  }
  return { parts, services };
}

// ---------------------------------------------------------------- factory wheels

export interface FactoryWheel {
  /** Bolt pattern, e.g. "4x100" */
  pcd: string;
  /** Smallest and largest factory rim diameter, inches */
  diameter: [number, number];
}

/**
 * Factory wheel data of the cars sold most in Uzbekistan, keyed by "make-model" slug
 * (the vehicle database slug). A car missing here gets the general explanation only.
 */
export const FACTORY_WHEELS: Record<string, FactoryWheel> = {
  'chevrolet-nexia-1': { pcd: '4x100', diameter: [13, 14] },
  'chevrolet-nexia-2': { pcd: '4x100', diameter: [14, 14] },
  'chevrolet-nexia-3': { pcd: '4x100', diameter: [15, 16] },
  'daewoo-nexia': { pcd: '4x100', diameter: [13, 14] },
  'chevrolet-cobalt': { pcd: '4x100', diameter: [14, 15] },
  'chevrolet-spark': { pcd: '4x100', diameter: [14, 15] },
  'chevrolet-matiz': { pcd: '4x114.3', diameter: [13, 14] },
  'daewoo-matiz': { pcd: '4x114.3', diameter: [13, 14] },
  'ravon-matiz': { pcd: '4x114.3', diameter: [13, 14] },
  'chevrolet-lacetti': { pcd: '4x114.3', diameter: [14, 15] },
  'daewoo-lacetti': { pcd: '4x114.3', diameter: [14, 15] },
  'chevrolet-gentra': { pcd: '4x114.3', diameter: [15, 15] },
  'daewoo-gentra': { pcd: '4x114.3', diameter: [15, 15] },
  'chevrolet-malibu': { pcd: '5x115', diameter: [16, 18] },
  'chevrolet-malibu-2': { pcd: '5x115', diameter: [16, 18] },
  'chevrolet-captiva': { pcd: '5x115', diameter: [17, 19] },
};

/** "Chevrolet Nexia 3" -> "chevrolet-nexia-3" (the vehicle API builds labels as "Make Model"). */
export function carSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function factoryWheelFor(car: FitCar | null | undefined): FactoryWheel | null {
  if (!car) return null;
  return FACTORY_WHEELS[carSlug(car.label)] ?? null;
}

/** "4 x 114,3" / "4X114.3" -> "4x114.3" */
export function normalizePcd(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.replace(',', '.').match(/^\s*(\d{1,2})\s*[x×*]\s*(\d{2,3}(?:\.\d{1,2})?)\s*$/i);
  if (!m) return null;
  return `${Number(m[1])}x${Number(m[2])}`;
}

const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * A wheel's sizes from its attributes. The seller form writes `pcd` / `diameter` / `width` / `offset`;
 * bulk-imported catalogs may use `bolt_pattern` / `diameter_in` / `width_in` / `offset_et`. Both are read.
 */
export function wheelSpecs(attributes: Record<string, unknown> | null | undefined): {
  pcd: string | null;
  diameter: number | null;
  width: number | null;
  offset: number | null;
} {
  const a = attributes ?? {};
  return {
    pcd: normalizePcd(a['pcd'] ?? a['bolt_pattern']),
    diameter: toNumber(a['diameter'] ?? a['diameter_in']),
    width: toNumber(a['width'] ?? a['width_in']),
    offset: toNumber(a['offset'] ?? a['offset_et']),
  };
}

/** How far above the factory diameter a plus-size wheel is still a common, safe fit. */
export const PLUS_SIZE_MAX = 2;

export type CheckState = 'ok' | 'warn' | 'bad' | 'unknown';

export interface WheelFitReport {
  factory: FactoryWheel | null;
  pcd: { value: string | null; state: CheckState };
  diameter: { value: number | null; state: CheckState; dir?: 'big' | 'small' | undefined };
  offset: { value: number | null };
}

/** Compares a wheel's attributes (`pcd`, `diameter`, `offset`) with the car's factory wheel. */
export function wheelFit(attributes: Record<string, unknown> | null | undefined, car: FitCar | null | undefined): WheelFitReport {
  const factory = factoryWheelFor(car);
  const { pcd, diameter, offset } = wheelSpecs(attributes);

  let pcdState: CheckState = 'unknown';
  if (factory && pcd) pcdState = pcd === factory.pcd ? 'ok' : 'bad';

  let diaState: CheckState = 'unknown';
  let dir: 'big' | 'small' | undefined;
  if (factory && diameter !== null) {
    const [min, max] = factory.diameter;
    if (diameter < min) {
      diaState = 'warn';
      dir = 'small';
    } else if (diameter > max + PLUS_SIZE_MAX) {
      diaState = 'warn';
      dir = 'big';
    } else diaState = 'ok';
  }

  return { factory, pcd: { value: pcd, state: pcdState }, diameter: { value: diameter, state: diaState, dir }, offset: { value: offset } };
}
