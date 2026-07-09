import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0C10',
        panel: '#12151B',
        elevated: '#1B1F27',
        elevated2: '#232833',
        hairline: '#262B35',
        'text-hi': '#E7E9EE',
        'text-mid': '#9BA3B4',
        'text-low': '#5C6472',
        violet: {
          DEFAULT: '#7C6AEF',
          dim: '#5A4FBF',
          bright: '#9686FF',
        },
        amber: {
          DEFAULT: '#E8A33D',
          dim: '#B8802B',
        },
        gitgreen: '#3FB950',
        gitred: '#F85149',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.35)',
        soft: '0 1px 2px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(124,106,239,0.25), 0 0 24px rgba(124,106,239,0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      borderRadius: {
        xl2: '1.1rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
