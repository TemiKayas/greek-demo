import type { Config } from 'tailwindcss';

const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#fffaf2',
        'cream-dark': '#fffcf8',
        'cream-light': '#fff6e8',
        brown: '#473025',
        'brown-dark': '#3a261e',
        orange: '#ff9f22',
        'orange-light': '#ffb554',
        lime: '#96b902',
        'lime-dark': '#7a9700',
        white: '#fffdfa',
      },
      fontFamily: {
        quicksand: ['Quicksand', 'sans-serif'],
        fantaisie: ['FantaisieArtistique', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        wordwyrm: {
          primary: '#96b902',
          'primary-content': '#ffffff',
          secondary: '#ff9f22',
          'secondary-content': '#ffffff',
          accent: '#ffb554',
          'accent-content': '#473025',
          neutral: '#473025',
          'neutral-content': '#ffffff',
          'base-100': '#fffaf2',
          'base-200': '#fffcf8',
          'base-300': '#fff6e8',
          'base-content': '#473025',
          info: '#3b82f6',
          'info-content': '#ffffff',
          success: '#96b902',
          'success-content': '#ffffff',
          warning: '#ff9f22',
          'warning-content': '#ffffff',
          error: '#ef4444',
          'error-content': '#ffffff',
          '--rounded-btn': '1rem',
          '--rounded-box': '1rem',
        },
      },
    ],
  },
} satisfies Config & { daisyui?: unknown };

export default config;
