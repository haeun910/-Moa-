/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        leaf: {
          50: '#FAFCF3',
          100: '#F2F6E0',
          200: '#E8F0C0',
          300: '#D6E6A0',
          400: '#C2D97E',
          500: '#A3BE5A',
          600: '#86A03F',
          700: '#687D2F',
          800: '#4A5D1E',
          900: '#333F14',
        },
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-bottom': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.25s ease-out',
      },
    },
  },
  plugins: [],
}

