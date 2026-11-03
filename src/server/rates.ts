import { DEFAULT_RATES } from '@/domain/currency';

/** Same live source the storefront uses, so a seller's price converts exactly as customers see it. */
export async function getServerRates(): Promise<Record<string, number | undefined>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('rates unavailable');
    const data = (await res.json()) as { rates?: Record<string, number> };
    const live = data.rates ?? {};
    const merged: Record<string, number | undefined> = { ...DEFAULT_RATES };
    for (const code of Object.keys(DEFAULT_RATES)) {
      const v = Number(live[code]);
      if (v > 0) merged[code] = v;
    }
    return merged;
  } catch {
    return DEFAULT_RATES;
  }
}
