import { NextResponse } from 'next/server';

export interface ExchangeRatesResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
}

// Fallback rates if external exchange API is unreachable or offline
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  UZS: 13000.0,
  AED: 3.6725,
  TRY: 34.2,
  RUB: 96.5,
  KGS: 86.5,
  KZT: 485.0,
  TJS: 10.9,
  EUR: 0.92,
};

export async function GET() {
  try {
    // Open Exchange Rates open API (cached for 1 hour by Next.js fetch cache)
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Exchange rate provider responded with status ${res.status}`);
    }

    const data = await res.json();
    const liveRates = data?.rates || {};

    const rates: Record<string, number> = {
      USD: 1.0,
      UZS: Number(liveRates['UZS']) || FALLBACK_RATES['UZS'] || 13000.0,
      AED: Number(liveRates['AED']) || FALLBACK_RATES['AED'] || 3.6725,
      TRY: Number(liveRates['TRY']) || FALLBACK_RATES['TRY'] || 34.2,
      RUB: Number(liveRates['RUB']) || FALLBACK_RATES['RUB'] || 96.5,
      KGS: Number(liveRates['KGS']) || FALLBACK_RATES['KGS'] || 86.5,
      KZT: Number(liveRates['KZT']) || FALLBACK_RATES['KZT'] || 485.0,
      TJS: Number(liveRates['TJS']) || FALLBACK_RATES['TJS'] || 10.9,
      EUR: Number(liveRates['EUR']) || FALLBACK_RATES['EUR'] || 0.92,
    };

    return NextResponse.json({
      success: true,
      base: 'USD',
      rates,
      updatedAt: data?.time_last_update_utc || new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error) {
    console.warn('Currency rates API fallback active:', error);
    return NextResponse.json({
      success: true,
      base: 'USD',
      rates: FALLBACK_RATES,
      updatedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}
