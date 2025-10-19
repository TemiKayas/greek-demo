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
          primary: '#0D5EAF',           // Greek blue
          'primary-content': '#ffffff',
          secondary: '#1E88E5',         // Aegean blue
          'secondary-content': '#ffffff',
          accent: '#D4AF37',            // Ancient gold
          'accent-content': '#ffffff',
          neutral: '#2c3e50',           // Dark slate
          'neutral-content': '#ffffff',
          'base-100': '#ffffff',        // White (Greek flag)
          'base-200': '#F8F9FA',        // Marble white
          'base-300': '#e8eaed',        // Light grey
          'base-content': '#1a202c',    // Dark text
          info: '#1E88E5',
          'info-content': '#ffffff',
          success: '#6B8E23',           // Olive
          'success-content': '#ffffff',
          warning: '#D4764E',           // Terracotta
          'warning-content': '#ffffff',
          error: '#dc2626',
          'error-content': '#ffffff',
          '--rounded-btn': '0.5rem',
          '--rounded-box': '0.75rem',
        },
      },
    ],
  },
} satisfies Config & { daisyui?: unknown };

export default config;
