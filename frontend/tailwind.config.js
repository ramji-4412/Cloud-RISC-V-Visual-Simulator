import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      width: {
        '84': '21rem'
      },
      colors: {
        studio: {
          background: 'var(--bg-app)',
          panel: 'var(--bg-panel)',
          border: 'var(--border-primary)',
          accent: 'var(--accent-primary)'
        }
      }
    }
  },
  plugins: [forms]
};
