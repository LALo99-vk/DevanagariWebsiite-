/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Figtree', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
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
          100: '#F3E6C6',
          200: '#E6D09D',
          300: '#DCC089',
          400: '#C9A45C',
          500: '#B08B45',
          600: '#8F6F33',
        },
        cream: '#EFE6D2',
        mist: '#B7C2B1',
        ivory: {
          50: '#FBF8F1',
          100: '#F6F0E4',
          200: '#ECE2CE',
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
