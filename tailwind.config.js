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
        background: '#0d1117',
        surface: '#161b22',
        surfaceHover: '#21262d',
        surfaceBorder: '#30363d',
        claude: {
          light: '#d97706',
          DEFAULT: '#d97706',
          dark: '#b45309',
          bg: 'rgba(217, 119, 6, 0.12)',
          border: 'rgba(217, 119, 6, 0.3)'
        },
        antigravity: {
          light: '#3b82f6',
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          bg: 'rgba(37, 99, 235, 0.12)',
          border: 'rgba(37, 99, 235, 0.3)'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
