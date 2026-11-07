/** Dial-code table used by the single-field phone input. Longest matching code wins. */
export interface DialCountry {
  iso: string;
  flag: string;
  /** Digits only, without "+". */
  code: string;
}

export const DEFAULT_DIGITS = '998';
export const MAX_PHONE_DIGITS = 15;

const COUNTRIES: DialCountry[] = [
  { iso: 'UZ', flag: '🇺🇿', code: '998' },
  { iso: 'KG', flag: '🇰🇬', code: '996' },
  { iso: 'TJ', flag: '🇹🇯', code: '992' },
  { iso: 'TM', flag: '🇹🇲', code: '993' },
  { iso: 'AZ', flag: '🇦🇿', code: '994' },
  { iso: 'GE', flag: '🇬🇪', code: '995' },
  { iso: 'AM', flag: '🇦🇲', code: '374' },
  { iso: 'UA', flag: '🇺🇦', code: '380' },
  { iso: 'BY', flag: '🇧🇾', code: '375' },
  { iso: 'TR', flag: '🇹🇷', code: '90' },
  { iso: 'AE', flag: '🇦🇪', code: '971' },
  { iso: 'SA', flag: '🇸🇦', code: '966' },
  { iso: 'IR', flag: '🇮🇷', code: '98' },
  { iso: 'AF', flag: '🇦🇫', code: '93' },
  { iso: 'IN', flag: '🇮🇳', code: '91' },
  { iso: 'CN', flag: '🇨🇳', code: '86' },
  { iso: 'KR', flag: '🇰🇷', code: '82' },
  { iso: 'DE', flag: '🇩🇪', code: '49' },
  { iso: 'GB', flag: '🇬🇧', code: '44' },
  { iso: 'FR', flag: '🇫🇷', code: '33' },
  { iso: 'IT', flag: '🇮🇹', code: '39' },
  { iso: 'ES', flag: '🇪🇸', code: '34' },
  { iso: 'RU', flag: '🇷🇺', code: '7' },
  { iso: 'US', flag: '🇺🇸', code: '1' },
];

const KZ: DialCountry = { iso: 'KZ', flag: '🇰🇿', code: '7' };

/** Country for a full international digit string (e.g. "998901234567"), or null while unknown. */
export function detectCountry(digits: string): DialCountry | null {
  // +7 is shared by Russia and Kazakhstan; Kazakh numbers start with 6 or 7 after the code.
  if (digits.startsWith('7') && (digits[1] === '6' || digits[1] === '7')) return KZ;
  let best: DialCountry | null = null;
  for (const c of COUNTRIES) {
    if (digits.startsWith(c.code) && (!best || c.code.length > best.code.length)) best = c;
  }
  return best;
}

/** "998901234567" -> "+998 90 123 45 67". */
export function formatInternational(digits: string): string {
  if (!digits) return '+';
  const country = detectCountry(digits);
  if (!country) return `+${digits}`;
  const rest = digits.slice(country.code.length);
  const chunks = country.iso === 'UZ' ? [2, 3, 2, 2] : [3, 3, 2, 2, 2];
  const parts: string[] = [];
  let i = 0;
  for (const size of chunks) {
    if (i >= rest.length) break;
    parts.push(rest.slice(i, i + size));
    i += size;
  }
  if (i < rest.length) parts.push(rest.slice(i));
  return `+${country.code}${parts.length ? ' ' + parts.join(' ') : ''}`;
}

/** Digits after the country code (0 when the country is not recognised yet). */
export function nationalLength(digits: string): number {
  const country = detectCountry(digits);
  return country ? digits.length - country.code.length : 0;
}
