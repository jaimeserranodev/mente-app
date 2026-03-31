/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#ECEADE',
        'cream-light': '#F2EFE8',
        brand: '#2C2C2C',
        muted: '#8C8C7A',
        'brand-black': '#1A1A1A',
        idea: '#D4A843',
        tarea: '#4CAF7D',
        proyecto: '#6B7FD4',
        nota: '#C4513A',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
