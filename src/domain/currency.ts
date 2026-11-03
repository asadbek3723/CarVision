/**
 * CarVision Pure Domain Module: Multi-Currency Formatter & Converter
 * Handles dynamic currency conversion, rounding rules, and locale-specific currency symbols.
 */

export type SupportedCurrency =
  | 'USD'
  | 'UZS'
  | 'AED'
  | 'TRY'
  | 'RUB'
  | 'KGS'
  | 'KZT'
  | 'TJS';

export type CurrencyCode = SupportedCurrency | string;

export interface ExchangeRates {
  USD: number;
  UZS: number;
  AED: number;
  TRY: number;
  RUB: number;
  KGS: number;
  KZT: number;
  TJS?: number;
  [currency: string]: number | undefined;
}

export const DEFAULT_RATES: ExchangeRates = {
  USD: 1.0,
  UZS: 13000.0,
  AED: 3.6725,
  TRY: 34.2,
  RUB: 96.5,
  KGS: 86.5,
  KZT: 485.0,
  TJS: 10.9,
};

export function convertToUSD(
  amount: number,
  fromCurrency: SupportedCurrency | string = 'USD',
  rates: ExchangeRates = DEFAULT_RATES
): number {
  const safe = Number.isFinite(amount) ? amount : 0;
  const upper = fromCurrency.toUpperCase();
  if (upper === 'USD' && safe > 50000) {
    return safe / (rates.UZS || 13000);
  }
  const rate = rates[upper] || 1.0;
  return safe / rate;
}

export interface CurrencyFormatOptions {
  amount: number; // Input amount (e.g. 100 USD or 1300000 UZS)
  fromCurrency?: string; // Base currency of the input amount (default: 'USD')
  targetLocale: string; // Target locale e.g. 'uz', 'ru', 'en', 'ar', 'tr', 'kk', 'ky', 'tg'
  rates?: ExchangeRates;
  /**
   * UI language used to format the number and currency symbol (e.g. 'ru' → "1 300 000 сум").
   * When omitted, the legacy English-style output ("1,300,000 so'm") is kept.
   */
  displayLocale?: string;
}

export interface ConvertedPrice {
  rawAmount: number;
  roundedAmount: number;
  currencyCode: string;
  currencySymbol: string;
  formattedText: string;
}

/**
 * Resolves the target currency code and symbol based on the active locale.
 */
export function getLocaleCurrency(locale: string): { code: string; symbol: string } {
  switch (locale) {
    case 'uz':
      return { code: 'UZS', symbol: "so'm" };
    case 'ar':
      return { code: 'AED', symbol: 'د.إ' };
    case 'tr':
      return { code: 'TRY', symbol: '₺' };
    case 'ru':
      return { code: 'RUB', symbol: '₽' };
    case 'kk':
      return { code: 'KZT', symbol: '₸' };
    case 'ky':
      return { code: 'KGS', symbol: 'сом' };
    case 'tg':
      return { code: 'TJS', symbol: 'смн' };
    case 'en':
    default:
      return { code: 'USD', symbol: '$' };
  }
}

/** How the Uzbek soum is written in each UI language. */
const UZS_SYMBOL_BY_LOCALE: Record<string, string> = {
  uz: 'soʻm',
  ru: 'сум',
  kk: 'сум',
  ky: 'сом',
  tg: 'сӯм',
  tr: 'so\'m',
  ar: 'سوم',
  en: "so'm",
};

/**
 * Converts a base price to the target locale's currency and formats it according to country rounding conventions.
 */
export function convertAndFormatPrice({
  amount,
  fromCurrency = 'USD',
  targetLocale,
  rates = DEFAULT_RATES,
  displayLocale,
}: CurrencyFormatOptions): ConvertedPrice {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const { code: targetCode, symbol } = getLocaleCurrency(targetLocale);

  // Normalize input amount to USD base first (auto-detecting raw UZS > 50,000 when fromCurrency is USD)
  const usdAmount = convertToUSD(safeAmount, fromCurrency, rates);

  // Convert USD to target currency
  const targetRate = rates[targetCode] || 1.0;
  const rawConverted = usdAmount * targetRate;

  let roundedAmount = rawConverted;

  // Apply country-specific rounding rules
  switch (targetCode) {
    case 'UZS':
      // Round to nearest 1,000 UZS for clean cash/card amounts
      roundedAmount = Math.round(rawConverted / 1000) * 1000;
      break;
    case 'KZT':
      // Round to nearest 100 KZT
      roundedAmount = Math.round(rawConverted / 100) * 100;
      break;
    case 'RUB':
    case 'KGS':
      // Round to nearest 10
      roundedAmount = Math.round(rawConverted / 10) * 10;
      break;
    case 'AED':
    case 'TRY':
    case 'TJS':
      // Round to whole units
      roundedAmount = Math.round(rawConverted);
      break;
    case 'USD':
    default:
      // Round to nearest integer if >= 10, else 2 decimal places
      roundedAmount = roundedAmount >= 10 ? Math.round(roundedAmount) : Math.round(roundedAmount * 100) / 100;
      break;
  }

  // Format with thousand separators
  const formattedNumber = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(roundedAmount);

  // Number grouping follows the UI language when given (ru: "1 300 000", tr: "1.300.000"); symbol stays per currency.
  let numberText = formattedNumber;
  let displaySymbol = symbol;
  if (displayLocale) {
    try {
      numberText = new Intl.NumberFormat(displayLocale === 'ar' ? 'ar-AE' : displayLocale, {
        maximumFractionDigits: 0,
      }).format(roundedAmount);
    } catch {
      numberText = formattedNumber;
    }
    if (targetCode === 'UZS') displaySymbol = UZS_SYMBOL_BY_LOCALE[displayLocale] ?? symbol;
  }

  const formattedText = targetCode === 'USD' ? `$${numberText}` : `${numberText} ${displaySymbol}`;

  return {
    rawAmount: rawConverted,
    roundedAmount,
    currencyCode: targetCode,
    currencySymbol: symbol,
    formattedText,
  };
}
