import type { Config } from 'tailwindcss';

/** Map a CSS-var token to a Tailwind color that supports opacity utilities. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        border: token('border'),
        text: token('text'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-fg': token('accent-fg'),
        'accent-soft': token('accent-soft'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        md: '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 4px 16px -4px rgb(0 0 0 / 0.10)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      ringColor: {
        DEFAULT: 'rgb(var(--ring) / 0.5)',
      },
    },
  },
};

export default config;
