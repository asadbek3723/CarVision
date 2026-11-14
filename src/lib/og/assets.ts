import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Shared look for every link-preview image (Open Graph / Twitter, 1200x630). Matches the Minimal Dark theme. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_COLORS = {
  page: '#0A0A0A',
  accent: '#FDC902',
  text: '#FFFFFF',
  muted: '#9A9A9A',
  faint: '#6B6B6B',
} as const;

const MONTSERRAT_SUBSETS = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'] as const;
const WEIGHTS = [500, 700] as const;

/**
 * Satori uses only the first file registered under a family name, so each subset gets its own name and the
 * family list chains them. Arabic is not here: Satori cannot shape Noto Sans Arabic, so `ar` renders English.
 */
const familyName = (subset: (typeof MONTSERRAT_SUBSETS)[number]) => `Montserrat ${subset}`;
export const OG_FONT_FAMILY = MONTSERRAT_SUBSETS.map((s) => `"${familyName(s)}"`).join(', ');

const DIR = join(process.cwd(), 'src/lib/og');

type OgFont = { name: string; data: Buffer; weight: 500 | 700; style: 'normal' };

let fontsPromise: Promise<OgFont[]> | null = null;

/** Montserrat 500/700: Latin, Turkish, Cyrillic incl. Kazakh/Kyrgyz/Tajik letters. Loaded once per server. */
export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    WEIGHTS.flatMap((weight) =>
      MONTSERRAT_SUBSETS.map(async (subset) => ({
        name: familyName(subset),
        data: await readFile(join(DIR, 'fonts', `montserrat-${subset}-${weight}-normal.woff`)),
        weight,
        style: 'normal' as const,
      }))
    )
  );
  return fontsPromise;
}

let carPromise: Promise<string> | null = null;

/** The hero car, already composed onto the 1200x630 dark canvas (car on the right, empty dark space on the left). */
export function loadOgCar(): Promise<string> {
  carPromise ??= readFile(join(DIR, 'og-car.jpg')).then((b) => `data:image/jpeg;base64,${b.toString('base64')}`);
  return carPromise;
}
