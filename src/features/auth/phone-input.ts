/**
 * Client-side phone helpers shared by the login and register screens, so both always produce the
 * same E.164 number that the server's `normalizePhone` expects.
 */

export interface Country {
  id: string;
  /** Stable value sent to the server — never shown to the user. */
  name: string;
  flag: string;
  code: string;
}

export const COUNTRIES: Country[] = [
  { id: 'uzbekistan', name: "O'zbekiston", flag: '🇺🇿', code: '+998' },
  { id: 'kazakhstan', name: "Qozog'iston", flag: '🇰🇿', code: '+7' },
  { id: 'kyrgyzstan', name: "Qirg'iziston", flag: '🇰🇬', code: '+996' },
  { id: 'tajikistan', name: 'Tojikiston', flag: '🇹🇯', code: '+992' },
  { id: 'turkmenistan', name: 'Turkmaniston', flag: '🇹🇲', code: '+993' },
  { id: 'russia', name: 'Rossiya', flag: '🇷🇺', code: '+7' },
  { id: 'turkey', name: 'Turkiya', flag: '🇹🇷', code: '+90' },
  { id: 'uae', name: 'BAA', flag: '🇦🇪', code: '+971' },
  { id: 'germany', name: 'Germaniya', flag: '🇩🇪', code: '+49' },
  { id: 'usa', name: 'AQSH', flag: '🇺🇸', code: '+1' },
  { id: 'uk', name: 'Buyuk Britaniya', flag: '🇬🇧', code: '+44' },
  { id: 'southKorea', name: 'Janubiy Koreya', flag: '🇰🇷', code: '+82' },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0]!;

/** Digits the user typed for the national part (country code and leading trunk 0 removed). */
export function nationalDigits(input: string, countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '');
  let digits = input.replace(/\D/g, '');
  const typedPlus = input.trim().startsWith('+');
  // "+998 90 123 45 67" or "998901234567": the user typed the country code too.
  const longestLocal = cc === '998' ? 9 : 10; // longer than any local number => code was typed too
  if (digits.startsWith(cc) && (typedPlus || digits.length > longestLocal)) digits = digits.slice(cc.length);
  return digits.replace(/^0+/, '');
}

/** Full E.164 number from the selected country and what the user typed. */
export function buildE164(country: Country, input: string): string {
  return `${country.code}${nationalDigits(input, country.code)}`;
}

/** True when the national part looks like a real number (7-12 digits). */
export function isPlausibleNational(input: string, country: Country): boolean {
  const n = nationalDigits(input, country.code).length;
  return country.code === '+998' ? n === 9 : n >= 7 && n <= 12;
}
