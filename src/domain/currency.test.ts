import { describe, it, expect } from 'vitest';
import { convertAndFormatPrice, getLocaleCurrency, DEFAULT_RATES } from './currency';

describe('Currency Domain Module', () => {
  it('correctly maps locales to target currency code and native symbols', () => {
    expect(getLocaleCurrency('uz')).toEqual({ code: 'UZS', symbol: "so'm" });
    expect(getLocaleCurrency('ar')).toEqual({ code: 'AED', symbol: 'د.إ' });
    expect(getLocaleCurrency('tr')).toEqual({ code: 'TRY', symbol: '₺' });
    expect(getLocaleCurrency('ru')).toEqual({ code: 'RUB', symbol: '₽' });
    expect(getLocaleCurrency('en')).toEqual({ code: 'USD', symbol: '$' });
  });

  it('converts USD to UZS and rounds to nearest 1,000 so\'m', () => {
    const result = convertAndFormatPrice({
      amount: 100, // $100
      fromCurrency: 'USD',
      targetLocale: 'uz',
      rates: { ...DEFAULT_RATES, UZS: 13000 },
    });

    expect(result.currencyCode).toBe('UZS');
    expect(result.roundedAmount).toBe(1300000);
    expect(result.formattedText).toBe("1,300,000 so'm");
  });

  it('converts USD to AED with whole unit rounding', () => {
    const result = convertAndFormatPrice({
      amount: 100,
      fromCurrency: 'USD',
      targetLocale: 'ar',
      rates: { ...DEFAULT_RATES, AED: 3.6725 },
    });

    expect(result.currencyCode).toBe('AED');
    expect(result.roundedAmount).toBe(367);
    expect(result.formattedText).toBe('367 د.إ');
  });

  it('converts from UZS back to USD correctly', () => {
    const result = convertAndFormatPrice({
      amount: 1300000,
      fromCurrency: 'UZS',
      targetLocale: 'en',
      rates: { ...DEFAULT_RATES, UZS: 13000 },
    });

    expect(result.currencyCode).toBe('USD');
    expect(result.roundedAmount).toBe(100);
    expect(result.formattedText).toBe('$100');
  });
});
