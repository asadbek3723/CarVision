import type { SupportedCurrency } from '@/domain/currency';

export const LANGUAGES = [
  { code: 'uz', name: "O'zbekcha" },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'ky', name: 'Кыргызча' },
  { code: 'tg', name: 'Тоҷикӣ' },
] as const;

export const CURRENCIES: SupportedCurrency[] = ['UZS', 'USD', 'AED', 'TRY', 'KZT', 'KGS', 'TJS', 'RUB'];

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0F]';

/** Same page in another locale: swaps the leading /{locale} segment. */
export function localizedPath(pathname: string, target: string): string {
  return pathname.replace(/^\/(uz|ru|en|ar|tr|kk|ky|tg)(?=\/|$)/, `/${target}`);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return (Array.from(first)[0] ?? '') + (Array.from(last)[0] ?? '');
}

/** Page container shared by the profile screens: full width up to 1500px. */
export const pageWrap = 'mx-auto w-full max-w-[1500px] px-5 pb-6 pt-6 md:px-10 md:pt-14 lg:px-16';
