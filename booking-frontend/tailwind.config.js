/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#8251EE',
          hover: '#9366F5',
          light: '#A37EF5',
          subtle: 'rgba(130, 81, 238, 0.15)',
        },
        neutral: {
          bg1: '#09090b', // slate-950
          bg2: '#18181b', // zinc-900 
          bg3: '#27272a', // zinc-800
          bg4: '#3f3f46', // zinc-700
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#a1a1aa', // zinc-400
          muted: '#71717a', // zinc-500
        },
        border: {
          subtle: 'hsla(0, 0%, 100%, 0.05)',
          DEFAULT: 'hsla(0, 0%, 100%, 0.10)',
          strong: 'hsla(0, 0%, 100%, 0.15)',
        }
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(130, 81, 238, 0.2)',
        'glow-lg': '0 0 40px rgba(130, 81, 238, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
        md: '12px',
        lg: '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      minHeight: {
        'touch': '48px', // Mobile accessibility rule
      },
      minWidth: {
        'touch': '48px', // Mobile accessibility rule
      },
    },
  },
  plugins: [],
};
