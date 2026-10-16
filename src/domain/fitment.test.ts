import { describe, it, expect } from 'vitest';
import { isPartFitForVehicle } from './fitment';

describe('domain/fitment', () => {
  it('allows universal finishes for any car', () => {
    const car = { make: 'Chevrolet', model: 'Malibu 2', boltPattern: '5x115' };
    const wrap = { compatibleModels: [], isUniversal: true };
    expect(isPartFitForVehicle(car, wrap)).toBe(true);
  });

  it('correctly matches bolt pattern for wheels', () => {
    const malibu = { make: 'Chevrolet', model: 'Malibu 2', boltPattern: '5x115' };
    const gentra = { make: 'Chevrolet', model: 'Gentra', boltPattern: '4x114.3' };

    const vossenHf5 = {
      compatibleModels: ['Chevrolet Malibu 2', 'Kia K5'],
      supportedPcd: ['5x115', '5x114.3'],
    };

    expect(isPartFitForVehicle(malibu, vossenHf5)).toBe(true);
    // Gentra has 4x114.3, so 5x115/5x114.3 wheel must be rejected
    expect(isPartFitForVehicle(gentra, vossenHf5)).toBe(false);
  });

  it('enforces model year restrictions', () => {
    const bumper = {
      compatibleModels: ['Chevrolet Malibu 2'],
      yearRange: { min: 2019, max: 2024 },
    };

    expect(isPartFitForVehicle({ make: 'Chevrolet', model: 'Malibu 2', year: 2021 }, bumper)).toBe(true);
    expect(isPartFitForVehicle({ make: 'Chevrolet', model: 'Malibu 2', year: 2017 }, bumper)).toBe(false);
  });
});
