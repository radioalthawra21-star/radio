/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main colors
        background: '#E3D4BE',
        primary: '#CD6F13',
        secondary: '#1C95A4',
        interactive: '#1C95A4',
        dark: '#182E4E',
        white: '#FFFFFF',
        // Use dark for status colors
        success: '#182E4E',
        warning: '#CD6F13',
        error: '#182E4E',
        info: '#1C95A4'
      },
      fontFamily: {
        // Arabic fonts
        arabic: ['CAIRO', 'sans-serif']
      },
      // RTL support
      direction: {
        rtl: 'rtl',
        ltr: 'ltr'
      }
    },
  },
  plugins: [],
}