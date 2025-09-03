/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'gray': {
          900: '#121826',
          800: '#1D2432',
          700: '#282E3E',
          600: '#333A4C',
          500: '#4E5569',
          400: '#6A7185',
          300: '#9096A7',
          200: '#B6BCC9',
          100: '#DDE0E7',
          50: '#F7F8FA',
        },
        'primary': {
          DEFAULT: '#6D28D9',
          light: '#8B5CF6',
          dark: '#5B21B6',
        },
        'secondary': {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
        },
      },
    },
  },
  plugins: [],
}