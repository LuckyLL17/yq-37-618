/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        ink: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1e3a5f',
          900: '#102a43',
          950: '#0a1929',
        },
        gold: {
          50: '#fef9e7',
          100: '#fdf3d4',
          200: '#fae7a8',
          300: '#f6db7d',
          400: '#e8c459',
          500: '#d4af37',
          600: '#b8942d',
          700: '#9a7b25',
          800: '#7c621e',
          900: '#5e4a17',
        },
        paper: {
          50: '#fdfcfa',
          100: '#f8f5f0',
          200: '#f0ebe2',
          300: '#e5ddd0',
          400: '#d4c9b8',
        },
        brick: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#f05252',
          600: '#e02424',
          700: '#c0392b',
          800: '#9b1c1c',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Source Han Serif SC', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', 'Source Han Sans SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'paper': '0 4px 20px -2px rgba(30, 58, 95, 0.1), 0 0 0 1px rgba(212, 175, 55, 0.05)',
        'paper-hover': '0 12px 40px -4px rgba(30, 58, 95, 0.15), 0 0 0 1px rgba(212, 175, 55, 0.1)',
        'gold': '0 0 0 2px rgba(212, 175, 55, 0.3), 0 4px 20px -2px rgba(212, 175, 55, 0.2)',
        'ink': '0 4px 20px -2px rgba(16, 42, 67, 0.2)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 175, 55, 0)' },
        },
        'shake': {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translate3d(0, 20px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translate3d(20px, 0, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        'gradient-gold': 'linear-gradient(135deg, #d4af37 0%, #f6db7d 50%, #d4af37 100%)',
        'gradient-ink': 'linear-gradient(135deg, #1e3a5f 0%, #334e68 50%, #1e3a5f 100%)',
      },
    },
  },
  plugins: [],
};
