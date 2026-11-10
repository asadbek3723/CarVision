'use client';

import * as React from 'react';

/**
 * Shows a number that counts from its previous value to the new one (about 0.5 s, ease-out), so a
 * total or a balance that changes is noticed instead of silently swapping. The first value is shown
 * at once. `format` turns the in-between number into text (e.g. a price formatter).
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(value);
  const raf = React.useRef(0);

  React.useEffect(() => {
    const start = from.current;
    if (start === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    const DURATION = 520;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = start + (value - start) * eased;
      from.current = v;
      setShown(v);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <>{format(shown)}</>;
}
