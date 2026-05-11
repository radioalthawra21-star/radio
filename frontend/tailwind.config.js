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
        primary: '#CD6F13',
        secondary: '#1C95A4',
        interactive: '#1C95A4',
        dark: '#182E4E',
        white: '#FFFFFF',
        success: '#182E4E',
        warning: '#CD6F13',
        error: '#182E4E',
        info: '#1C95A4'
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
