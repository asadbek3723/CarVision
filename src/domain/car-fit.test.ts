import { describe, expect, it } from 'vitest';
import { carFit, carSlug, factoryWheelFor, fitSummary, normalizePcd, wheelFit } from './car-fit';

const COBALT = { modelId: 'cobalt-id', label: 'Chevrolet Cobalt', year: 2020 };

describe('carFit', () => {
  it('is null without a car', () => {
    expect(carFit({ isUniversal: true }, null)).toBeNull();
  });

  it('marks universal items', () => {
    expect(carFit({ isUniversal: true, compatibility: [] }, COBALT)).toBe('universal');
  });

  it('matches the listed model inside the year range', () => {
    expect(carFit({ compatibility: [{ id: 'cobalt-id', yearFrom: 2012, yearTo: 2025 }] }, COBALT)).toBe('exact');
  });

  it('treats open year bounds as open', () => {
    expect(carFit({ compatibility: [{ id: 'cobalt-id', yearFrom: null, yearTo: null }] }, COBALT)).toBe('exact');
  });

  it('rejects a year outside the range', () => {
    expect(carFit({ compatibility: [{ id: 'cobalt-id', yearFrom: 2021, yearTo: 2025 }] }, COBALT)).toBeNull();
  });

  it('ignores the year when the customer gave none', () => {
    expect(carFit({ compatibility: [{ id: 'cobalt-id', yearFrom: 2021, yearTo: 2025 }] }, { ...COBALT, year: undefined })).toBe('exact');
  });

  it('rejects another model', () => {
    expect(carFit({ compatibility: [{ id: 'gentra-id' }] }, COBALT)).toBeNull();
  });
});

describe('fitSummary', () => {
  it('counts parts and universal services separately', () => {
    const list = [{ compatibility: [{ id: 'cobalt-id' }] }, { compatibility: [{ id: 'cobalt-id' }] }, { isUniversal: true }, { compatibility: [{ id: 'x' }] }];
    expect(fitSummary(list, COBALT)).toEqual({ parts: 2, services: 1 });
  });
});

describe('factory wheels', () => {
  it('builds the slug from the vehicle label', () => {
    expect(carSlug('Chevrolet Nexia 3')).toBe('chevrolet-nexia-3');
    expect(carSlug('  Chevrolet  Malibu 2 ')).toBe('chevrolet-malibu-2');
  });

  it('finds the factory wheel of a known car', () => {
    expect(factoryWheelFor(COBALT)?.pcd).toBe('4x100');
    expect(factoryWheelFor({ modelId: 'x', label: 'Unknown Car' })).toBeNull();
  });

  it('normalizes bolt patterns', () => {
    expect(normalizePcd('4 x 114,3')).toBe('4x114.3');
    expect(normalizePcd('5X115')).toBe('5x115');
    expect(normalizePcd('nonsense')).toBeNull();
    expect(normalizePcd(100)).toBeNull();
  });
});

describe('wheelFit', () => {
  it('accepts a matching wheel', () => {
    const r = wheelFit({ pcd: '4x100', diameter: 16, offset: 40 }, COBALT);
    expect(r.pcd.state).toBe('ok');
    expect(r.diameter.state).toBe('ok');
    expect(r.offset.value).toBe(40);
  });

  it('flags a wrong bolt pattern', () => {
    expect(wheelFit({ pcd: '5x114.3', diameter: 15 }, COBALT).pcd.state).toBe('bad');
  });

  it('warns on a rim far above the factory size', () => {
    const r = wheelFit({ pcd: '4x100', diameter: 18 }, COBALT);
    expect(r.diameter).toMatchObject({ state: 'warn', dir: 'big' });
  });

  it('warns on a rim below the factory size', () => {
    expect(wheelFit({ pcd: '4x100', diameter: 13 }, COBALT).diameter).toMatchObject({ state: 'warn', dir: 'small' });
  });

  it('reads the bulk-import attribute names too', () => {
    const r = wheelFit({ bolt_pattern: '4x100', diameter_in: 16, offset_et: 38 }, COBALT);
    expect(r.pcd).toEqual({ value: '4x100', state: 'ok' });
    expect(r.diameter.state).toBe('ok');
    expect(r.offset.value).toBe(38);
  });

  it('cannot judge without factory data or attributes', () => {
    const r = wheelFit({}, { modelId: 'x', label: 'Unknown Car' });
    expect(r.factory).toBeNull();
    expect(r.pcd.state).toBe('unknown');
    expect(r.diameter.state).toBe('unknown');
  });
});
