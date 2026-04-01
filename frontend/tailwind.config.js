/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f0',
          100: '#f9eddb',
          200: '#f2d7b0',
          300: '#e9bb7d',
          400: '#de9748',
          500: '#d67d2b',
          600: '#c76321',
          700: '#a64b1d',
          800: '#863d1f',
          900: '#6e331c',
          950: '#3b190d',
        },
      },
    },
  },
  plugins: [],
}
