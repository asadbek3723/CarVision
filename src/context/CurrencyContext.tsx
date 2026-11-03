'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  DEFAULT_RATES,
  type ExchangeRates,
  type ConvertedPrice,
  type CurrencyCode,
  convertAndFormatPrice,
  getLocaleCurrency,
} from '@/domain/currency';

export type { CurrencyCode };

interface CurrencyContextValue {
  rates: ExchangeRates;
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  setCurrency: (code: string) => void;
  formatPrice: (amount: number, fromCurrency?: string) => string;
  convertPrice: (amount: number, fromCurrency?: string) => ConvertedPrice;
  isLoadingRates: boolean;
}

const CurrencyContext = React.createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const [rates, setRates] = React.useState<ExchangeRates>(DEFAULT_RATES);
  const [isLoadingRates, setIsLoadingRates] = React.useState(true);
  const [customCurrency, setCustomCurrency] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/currency/rates')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.rates) {
          setRates(data.rates);
        }
      })
      .catch((err) => {
        console.warn('Could not load live rates, using fallback rates:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingRates(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carvision_preferred_currency');
      if (saved) {
        setCustomCurrency(saved);
      }
    }
  }, []);

  const handleSetCurrency = React.useCallback((code: string) => {
    setCustomCurrency(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('carvision_preferred_currency', code);
    }
  }, []);

  const { code: autoCode, symbol: autoSymbol } = React.useMemo(() => {
    return getLocaleCurrency(locale);
  }, [locale]);

  const currencyCode = customCurrency || autoCode;
  const currencySymbol = customCurrency
    ? customCurrency === 'UZS'
      ? "so'm"
      : customCurrency === 'USD'
      ? '$'
      : customCurrency === 'RUB'
      ? '₽'
      : customCurrency === 'AED'
      ? 'د.إ'
      : customCurrency === 'TRY'
      ? '₺'
      : customCurrency === 'KZT'
      ? '₸'
      : customCurrency === 'KGS'
      ? 'сом'
      : customCurrency === 'TJS'
      ? 'смн'
      : autoSymbol
    : autoSymbol;

  const convertPrice = React.useCallback(
    (amount: number, fromCurrency: string = 'USD'): ConvertedPrice => {
      const effectiveLocale = customCurrency
        ? customCurrency === 'UZS'
          ? 'uz'
          : customCurrency === 'RUB'
          ? 'ru'
          : customCurrency === 'AED'
          ? 'ar'
          : customCurrency === 'TRY'
          ? 'tr'
          : customCurrency === 'KZT'
          ? 'kk'
          : customCurrency === 'KGS'
          ? 'ky'
          : customCurrency === 'TJS'
          ? 'tg'
          : 'en'
        : locale;

      return convertAndFormatPrice({
        amount,
        fromCurrency,
        targetLocale: effectiveLocale,
        rates,
        displayLocale: locale,
      });
    },
    [locale, customCurrency, rates]
  );

  const formatPrice = React.useCallback(
    (amount: number, fromCurrency: string = 'USD'): string => {
      return convertPrice(amount, fromCurrency).formattedText;
    },
    [convertPrice]
  );

  return (
    <CurrencyContext.Provider
      value={{
        rates,
        currency: currencyCode,
        currencyCode,
        currencySymbol,
        setCurrency: handleSetCurrency,
        formatPrice,
        convertPrice,
        isLoadingRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = React.useContext(CurrencyContext);
  if (!context) {
    // Graceful fallback if used outside CurrencyProvider
    const defaultVal = getLocaleCurrency('uz');
    return {
      rates: DEFAULT_RATES,
      currency: defaultVal.code,
      currencyCode: defaultVal.code,
      currencySymbol: defaultVal.symbol,
      setCurrency: () => {},
      formatPrice: (amount: number, fromCurrency = 'USD') =>
        convertAndFormatPrice({
          amount,
          fromCurrency,
          targetLocale: 'uz',
          rates: DEFAULT_RATES,
        }).formattedText,
      convertPrice: (amount: number, fromCurrency = 'USD') =>
        convertAndFormatPrice({
          amount,
          fromCurrency,
          targetLocale: 'uz',
          rates: DEFAULT_RATES,
        }),
      isLoadingRates: false,
    };
  }
  return context;
}
