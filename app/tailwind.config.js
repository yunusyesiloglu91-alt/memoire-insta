/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: { 950: '#060609', 900: '#0b0b10', 850: '#101017', 800: '#15151e', 700: '#1e1e2a', 600: '#2a2a3a' },
        haze: { 400: '#8b8ba3', 300: '#a9a9bf', 200: '#cfcfe0', 100: '#ececf5' },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,.06), 0 20px 60px -20px rgba(168,85,247,.45)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 10px 30px -12px rgba(0,0,0,.6)',
      },
      backgroundImage: {
        aurora: 'linear-gradient(120deg,#a855f7 0%,#ec4899 45%,#f97316 100%)',
      },
      keyframes: {
        drift: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(4%,-6%) scale(1.08)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        drift: 'drift 18s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
}
