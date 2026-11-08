import { Geist } from 'next/font/google';

/**
 * "Minimal Dark" look from the Figma file (Car Viison → Do'kon / Profil frames).
 * Loaded only by the screens that use it, so the rest of the app keeps its own fonts.
 */
export const geist = Geist({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: 'variable', display: 'swap' });

/** Colours read from the Figma frames. */
export const md = {
  /** page background #0A0A0A */
  page: 'bg-[#0A0A0A]',
  /** cards, inputs, chips #161616 */
  card: 'bg-[#161616]',
  /** tiles and secondary buttons inside a card #222222 */
  tile: 'bg-[#222222]',
  /** 1px hairline #262626 */
  line: 'border-[#262626]',
  /** secondary text #9A9A9A */
  muted: 'text-[#9A9A9A]',
  /** placeholder and tertiary text #6B6B6B */
  faint: 'text-[#6B6B6B]',
  /** primary accent #FDC902 */
  accentBg: 'bg-[#FDC902]',
  accentText: 'text-[#FDC902]',
  /** accent at 14% for soft tiles and pills */
  accentSoft: 'bg-[#FDC902]/[0.14]',
} as const;

export const mdFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDC902]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]';
