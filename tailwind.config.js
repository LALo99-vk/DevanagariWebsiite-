/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Figtree', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        // Only the animated navbar wordmark keeps Fraunces
        wordmark: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        primary: '#14402E',
        secondary: '#B08A45',
        accent: '#E9DFC9',
        background: '#F6F0E4',
        // Dark Emerald & Gold: solid surfaces, gold used as ink
        emerald: {
          950: '#0A1F16',
          900: '#0F2A1F',
          800: '#14352A',
          700: '#1B4434',
          600: '#245A45',
          500: '#2E7256',
          400: '#4FA37C',
          300: '#8CCBA9',
        },
        gold: {
          100: '#F6E2A8',
          200: '#EDCB78',
          300: '#E3BC5C',
          400: '#D4A63E',
          500: '#B88A2A',
          600: '#946C1E',
        },
        cream: '#EFE6D2',
        mist: '#B7C2B1',
        ivory: {
          50: '#FBF8F1',
          100: '#F6F0E4',
          200: '#ECE2CE',
        },
        // Admin panel: ivory paper, forest ink, state colours only where they mean something
        adm: {
          paper: '#F6F0E4',
          raised: '#FBF7EE',
          sunk: '#F1E9D8',
          rule: '#DCCFAF',
          'rule-soft': '#E8DEC6',
          ink: '#0B2118',
          'ink-2': '#3D4C43',
          'ink-3': '#56635A',
          forest: '#14402E',
          'forest-deep': '#0B2118',
          'on-forest': '#EEF3EC',
          gold: '#C9A45C',
          brick: '#B4412F',
          'brick-ink': '#7E2817',
          'brick-wash': '#F7DCD3',
          'amber-ink': '#6E4300',
          'amber-wash': '#F7E2B8',
          'sage-ink': '#14402E',
          'sage-wash': '#DCEBDD',
        },
      },
      animation: {
        in: 'in 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'zoom-in': 'zoom-in 0.2s ease-out',
        rise: 'rise 0.7s cubic-bezier(0.25, 1, 0.5, 1) both',
      },
      keyframes: {
        in: {
          '0%': { transform: 'translateY(18px)', opacity: '0' },
          '100%': { transform: 'translateY(0px)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        rise: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
