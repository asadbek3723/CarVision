'use client';

import * as React from 'react';

export interface MyCar {
  modelId: string;
  label: string;
  year?: number | undefined;
}

const KEY = 'carvision_my_car';
const EVENT = 'carvision:my-car';

function read(): MyCar | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as MyCar;
    return v && typeof v.modelId === 'string' && typeof v.label === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** The customer's car, remembered on this device and shared between all screens. */
export function useMyCar() {
  const [car, setCarState] = React.useState<MyCar | null>(null);

  React.useEffect(() => {
    setCarState(read());
    const sync = () => setCarState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setCar = React.useCallback((next: MyCar | null) => {
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch {
      // storage unavailable: keep it in memory only
    }
    setCarState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  /** Query string fragment for /api/v1/products */
  const filterQuery = car ? `model=${encodeURIComponent(car.modelId)}${car.year ? `&year=${car.year}` : ''}` : '';

  return { car, setCar, filterQuery };
}
