/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#4A5C3D',
        secondary: '#A88B67',
        accent: '#E6D9C5',
        background: '#FDFBF8',
      },
      animation: {
        'in': 'in 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'zoom-in': 'zoom-in 0.2s ease-out',
      },
      keyframes: {
        'in': {
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
      },
    },
  },
  plugins: [],
};