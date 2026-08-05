/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3ccff',
          300: '#80a8ff',
          400: '#4d7dff',
          500: '#2557f5',
          600: '#1a3fc7',
          700: '#172f9c',
          800: '#152a7d',
          900: '#0F172A'
        },
        accent: {
          50: '#fff8ed',
          100: '#ffedd0',
          200: '#ffd89f',
          300: '#ffbd63',
          400: '#ff9c2e',
          500: '#f97e0a',
          600: '#dc6006',
          700: '#b64709',
          800: '#93380e',
          900: '#78300f'
        },
        surface: {
          DEFAULT: '#0B1220',
          card: '#111A2E',
          border: '#1E293B'
        }
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.3), 0 1px 3px 1px rgb(0 0 0 / 0.15)'
      }
    }
  },
  plugins: []
};
