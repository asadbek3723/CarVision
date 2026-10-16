/**
 * CarVision Pure Domain Module: Vehicle Fitment Engine
 * Ensures wheels, body kits, and accessories physically fit the vehicle model and bolt pattern.
 */

export interface VehicleFitmentSpec {
  make: string;
  model: string;
  year?: number;
  boltPattern?: string; // e.g. "5x115", "4x114.3", "5x112"
}

export interface PartFitmentSpec {
  compatibleModels: string[];
  supportedPcd?: string[];
  yearRange?: { min: number; max: number };
  isUniversal?: boolean;
}

/**
 * Checks if a specific part is technically compatible with a vehicle.
 */
export function isPartFitForVehicle(vehicle: VehicleFitmentSpec, part: PartFitmentSpec): boolean {
  // Universal items (wraps, tint, ceramic) fit all vehicles
  if (part.isUniversal || (part.compatibleModels.length === 0 && !part.supportedPcd)) {
    return true;
  }

  // Check bolt pattern (PCD) compatibility for wheels
  if (vehicle.boltPattern && part.supportedPcd && part.supportedPcd.length > 0) {
    if (!part.supportedPcd.includes(vehicle.boltPattern)) {
      return false;
    }
  }

  // Check year range if specified
  if (vehicle.year && part.yearRange) {
    if (vehicle.year < part.yearRange.min || vehicle.year > part.yearRange.max) {
      return false;
    }
  }

  // Check model name match
  const vehicleNameNormalized = `${vehicle.make} ${vehicle.model}`.toLowerCase();
  const isModelMatched = part.compatibleModels.some((model) =>
    vehicleNameNormalized.includes(model.toLowerCase())
  );

  // If part specifies compatible models, at least one must match
  if (part.compatibleModels.length > 0) {
    return isModelMatched;
  }

  return true;
}
