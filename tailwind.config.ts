import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './styles/**/*.css'
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
        },
        accent: {
          cyan: 'var(--accent-cyan)',
          'cyan-hover': 'var(--accent-cyan-hover)',
          'cyan-subtle': 'var(--accent-cyan-subtle)',
          green: 'var(--accent-green)',
          'green-hover': 'var(--accent-green-hover)',
          'green-subtle': 'var(--accent-green-subtle)',
          gold: 'var(--accent-gold)',
          'gold-hover': 'var(--accent-gold-hover)',
          'gold-subtle': 'var(--accent-gold-subtle)',
        },
        status: {
          danger: 'var(--status-danger)',
          warning: 'var(--status-warning)',
          info: 'var(--status-info)',
        },
        text: {
          primary: 'var(--text-primary)',
          pure: 'var(--text-pure)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          light: 'var(--border-light)',
          active: 'var(--border-active)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          deep: 'var(--gold-deep)',
        },
        'gold-deep': 'var(--gold-deep)',
        ink: 'var(--ink)',
        foreground: '#F5F7FA',
        destructive: '#EF4444',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
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
        glow: '0 0 25px var(--accent-glow)',
        'glow-lg': '0 0 35px var(--accent-glow-strong)',
        'glow-green': '0 0 25px var(--accent-green-glow)',
        'glow-gold': '0 0 25px var(--accent-gold-glow)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      }
    }
  },
  plugins: [animate]
};

export default config;
