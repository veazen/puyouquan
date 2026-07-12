import type { Config } from 'tailwindcss';

// Brand design tokens (PROJECT_PLAN §2.5) — same palette as apps/marketing.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        basalt: '#16191d',
        'basalt-deep': '#101317',
        limestone: '#e9e4d8',
        'limestone-dim': '#a9a498',
        jade: '#3fa37c',
        'jade-deep': '#2c7a5c',
        // verify-page three-state extensions, tuned to the §2.5 palette
        'state-warn': '#c9a24b',
        'state-alert': '#c05b4d',
      },
      borderColor: {
        etch: 'rgba(233,228,216,.07)',
      },
      fontFamily: {
        display: ['Marcellus', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
