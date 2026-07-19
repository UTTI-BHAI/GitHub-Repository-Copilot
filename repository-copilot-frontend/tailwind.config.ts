import type { Config } from 'tailwindcss'

export default {
  // Dark mode removed — the app ships a single light theme.
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm near-blacks rather than the previous blue-tinted #0A0C10.
        // Shifting the neutrals toward brown makes long reading sessions
        // easier and stops the surfaces reading as glossy.
        ink: '#1F1E1D', // app background
        panel: '#262624', // sidebar and panels
        elevated: '#30302E', // cards and inputs
        elevated2: '#3A3A37', // raised surfaces
        hairline: '#3E3E3B', // borders

        // Off-white rather than pure white — pure #FFF on a dark surface
        // glares and exaggerates contrast.
        'text-hi': '#F5F3EE',
        'text-mid': '#B7B4AC',
        'text-low': '#7E7B74',

        violet: {
          DEFAULT: '#388087',  // buttons and filled surfaces
          dim: '#2A666C',      // hover and active
          bright: '#7CC3CB',   // icons and highlights on dark
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
        glow: '0 0 0 1px rgba(56,128,135,0.3), 0 0 24px rgba(56,128,135,0.15)',
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