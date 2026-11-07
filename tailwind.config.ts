import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/** A colour from styles/tokens.css (`--c-<name>` holds RGB channels). */
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;
const scale = (name: string, steps: number[]) =>
  Object.fromEntries(steps.map((step) => [step, c(`${name}-${step}`)]));

const config: Config = {
  darkMode: ['class'],
  // Paths are resolved from this file, not from the process folder (see postcss.config.mjs).
  content: {
    relative: true,
    files: ['./src/**/*.{ts,tsx}', './styles/**/*.css'],
  },
  theme: {
    extend: {
      colors: {
        // Every colour reads a token from styles/tokens.css. `<alpha-value>` keeps opacity
        // modifiers (bg-primary/10, text-foreground/60 ...) working.
        gold: {
          ...scale('gold', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
          DEFAULT: c('gold-500'),
          soft: c('gold-300'),
          deep: c('gold-600'),
        },
        'gold-soft': c('gold-300'),
        'gold-deep': c('gold-600'),
        neutral: scale('neutral', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        surface: {
          ...scale('surface', [0, 1, 2, 3]),
          DEFAULT: c('surface-1'),
        },
        // Semantic names (shadcn-style) that existing pages already use.
        primary: { DEFAULT: c('gold-500'), foreground: c('ink') },
        foreground: c('fg'),
        'muted-foreground': c('fg-muted'),
        muted: { DEFAULT: c('surface-2'), foreground: c('fg-muted') },
        card: { DEFAULT: c('surface-1'), foreground: c('fg') },
        accent: { DEFAULT: c('surface-2'), foreground: c('gold-300') },
        background: c('page'),
        ink: c('ink'),
        border: 'var(--line)',
        ring: c('gold-500'),
        success: c('success'),
        warning: c('warning'),
        destructive: { DEFAULT: c('danger'), foreground: c('neutral-50') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
        info: c('info'),
      },
      borderRadius: {
        // Design scale 8 / 12 / 16 / 24. The old scale was 10 / 14 / 18 / 24 / 32 with
        // 3xl falling back to Tailwind's 24px, i.e. 2xl (32) > 3xl (24). Now strictly increasing:
        // xs 6 (unchanged), sm 10→8, md 14→12, lg 18→16, xl 24 (unchanged),
        // 2xl 32→28 (shrinks 4px, the least that fixes the order), 3xl 24→32.
        xs: '6px',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': '28px',
        '3xl': '32px',
        full: 'var(--r-full)',
      },
      transitionDuration: {
        micro: 'var(--dur-micro)',
        ui: 'var(--dur-ui)',
        section: 'var(--dur-section)',
      },
      transitionTimingFunction: {
        brand: 'var(--ease-out)',
        'brand-in-out': 'var(--ease-in-out)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'var(--font-outfit)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-outfit)', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        manrope: ['var(--font-manrope)', 'sans-serif'],
        serif: ['var(--font-cinzel)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
        arabic: ['var(--font-noto-arabic)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        e1: 'var(--e1)',
        e2: 'var(--e2)',
        e3: 'var(--e3)',
        e4: 'var(--e4)',
        highlight: 'var(--highlight)',
        'glow-gold': 'var(--glow-gold)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      }
    }
  },
  plugins: [animate]
};

export default config;
