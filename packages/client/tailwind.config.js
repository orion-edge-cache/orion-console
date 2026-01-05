/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/main.tsx",
    "./src/routeTree.gen.ts",
    "./src/{components,lib,routes,styles}/**/*.{js,ts,jsx,tsx}",
    // Tremor components
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Orion Brand Colors
        orion: {
          50: '#e8ecf2',
          100: '#c5cfe0',
          200: '#9eb0cc',
          300: '#7791b8',
          400: '#5a7aa8',
          500: '#3d6399',
          600: '#1f395f', // Primary brand color (Navy)
          700: '#1a3050',
          800: '#142741',
          900: '#0f1e32',
          950: '#0a1423',
        },
        // Accent Cyan/Teal
        accent: {
          50: '#e8f8fa',
          100: '#d1f1f5',
          200: '#a3e3eb',
          300: '#63c9d6', // Primary accent color (Cyan)
          400: '#4bbfce',
          500: '#33b5c6',
          600: '#2a9aaa',
          700: '#227f8e',
          800: '#1a6472',
          900: '#124956',
        },
        // Tremor color overrides for brand alignment
        tremor: {
          brand: {
            faint: '#e8ecf2',
            muted: '#c5cfe0',
            subtle: '#7791b8',
            DEFAULT: '#1f395f',
            emphasis: '#1a3050',
            inverted: '#ffffff',
          },
          background: {
            muted: '#f8fafc',
            subtle: '#f1f5f9',
            DEFAULT: '#ffffff',
            emphasis: '#1f395f',
          },
          border: {
            DEFAULT: 'rgba(31, 57, 95, 0.10)',
          },
          ring: {
            DEFAULT: 'rgba(99, 201, 214, 0.3)',
          },
          content: {
            subtle: '#94a3b8',
            DEFAULT: '#4a5e78',
            emphasis: '#1f395f',
            strong: '#0f1e32',
            inverted: '#ffffff',
          },
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Tremor shadow overrides
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
      },
      borderRadius: {
        'tremor-small': '0.375rem',
        'tremor-default': '0.5rem',
        'tremor-full': '9999px',
      },
      fontSize: {
        'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
        'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
        'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
        'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [],
}
