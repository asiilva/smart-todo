/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: '#6344E0',
          soft: 'var(--color-accent-soft)',
        },
        surface: 'var(--color-surface)',
        danger: '#F0556E',
        warning: '#F5A623',
        success: '#2CC197',
        border: 'var(--color-border)',
        bg: {
          DEFAULT: 'var(--color-bg)',
          hover: 'var(--color-bg-hover)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          dim: 'var(--color-text-dim)',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '18px',
        xl: '22px',
        pill: '9999px',
      },
      boxShadow: {
        DEFAULT: '0 2px 8px rgba(124,92,252,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        sm: '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
        glow: '0 0 0 3px rgba(124,92,252,0.12)',
        lift: '0 4px 16px rgba(124,92,252,0.3)',
        card: '0 4px 12px rgba(124,92,252,0.08)',
      },
    },
  },
  plugins: [],
};
