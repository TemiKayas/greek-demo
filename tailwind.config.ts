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
        // Greek-inspired colors
        'greek-blue': '#0D5EAF',
        'greek-blue-dark': '#074a8e',
        'greek-blue-light': '#3d7ec4',
        'aegean': '#1E88E5',
        'mediterranean': '#0277BD',
        terracotta: '#D4764E',
        'ancient-gold': '#D4AF37',
        'marble-white': '#F8F9FA',
        'olive': '#6B8E23',
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
        greek: {
          primary: '#3B82F6',           // Bright blue for accents
          'primary-content': '#ffffff',
          secondary: '#60A5FA',         // Lighter blue
          'secondary-content': '#ffffff',
          accent: '#2563EB',            // Deep blue accent
          'accent-content': '#ffffff',
          neutral: '#2d3748',           // Dark gray
          'neutral-content': '#ffffff',
          'base-100': '#1a1a1a',        // Soft dark gray
          'base-200': '#242424',        // Slightly lighter dark
          'base-300': '#2d2d2d',        // Medium dark gray
          'base-content': '#ffffff',    // White text
          info: '#3B82F6',
          'info-content': '#ffffff',
          success: '#10B981',           // Green
          'success-content': '#ffffff',
          warning: '#F59E0B',           // Orange
          'warning-content': '#ffffff',
          error: '#EF4444',
          'error-content': '#ffffff',
          '--rounded-btn': '0.5rem',
          '--rounded-box': '0.75rem',
        },
      },
    ],
  },
} satisfies Config & { daisyui?: unknown };

export default config;
