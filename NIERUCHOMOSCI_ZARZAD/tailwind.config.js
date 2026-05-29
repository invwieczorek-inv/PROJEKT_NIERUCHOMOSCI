/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a2ff',
          500: '#5c78ff',
          600: '#3d4eff',
          700: '#2e39eb',
          800: '#252ec2',
          900: '#22299c',
        },
        dark: {
          50: '#f6f6f7',
          100: '#eef0f2',
          200: '#dcdfe3',
          300: '#bfc5cb',
          400: '#9fa7af',
          500: '#7f8a94',
          600: '#66707a',
          700: '#535b64',
          800: '#32373e',
          900: '#1e2124',
          950: '#0f1113',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
