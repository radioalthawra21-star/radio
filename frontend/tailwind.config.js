/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#E3D4BE',
        foreground: '#182E4E',
        primary: {
          DEFAULT: '#CD6F13',
          foreground: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#1C95A4',
          foreground: '#FFFFFF'
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF'
        },
        success: {
          DEFAULT: '#16A34A',
          foreground: '#FFFFFF'
        },
        warning: '#CD6F13',
        error: '#DC2626',
        info: '#1C95A4',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#182E4E'
        },
        accent: {
          DEFAULT: '#1C95A4',
          foreground: '#FFFFFF'
        },
        muted: {
          foreground: '#6B7280'
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#182E4E'
        },
        ring: '#CD6F13',
        input: '#D1D5DB',
        interactive: '#1C95A4',
        dark: '#182E4E'
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      direction: {
        rtl: 'rtl',
        ltr: 'ltr'
      }
    }
  },
  plugins: []
}
