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
        },
        accent: {
          cyan: 'var(--accent-cyan)',
          'cyan-hover': 'var(--accent-cyan-hover)',
          green: 'var(--accent-green)',
        },
        status: {
          danger: 'var(--status-danger)',
          warning: 'var(--status-warning)',
          info: 'var(--status-info)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          active: 'var(--border-active)',
        }
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-noto-arabic)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px var(--accent-glow)',
        'glow-green': '0 0 20px var(--accent-green-glow)',
      }
    }
  },
  plugins: [animate]
};

export default config;
