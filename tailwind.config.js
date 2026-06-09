/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2B7EC1',
        'primary-dark': '#0D2E5A',
        'primary-mid': '#1A4F7A',
        highlight: '#4A9FD4',
        glow: '#85C4E8',
        surface: '#F0F6FC',
        border: '#C8DFF0',
        'text-primary': '#0D1B2A',
        'text-secondary': '#4A6F8A',
        'text-disabled': '#A0BDD0',
        success: '#2ECC71',
        warning: '#F39C12',
        danger: '#E74C3C',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
