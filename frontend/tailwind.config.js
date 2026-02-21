/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold:    '#c9a84c',
        'gold-light': '#e8d5a3',
        navy:    '#0d1b2a',
        'navy-2': '#1a2d3e',
        'navy-3': '#243547',
        slate:   '#a8b8c8',
        'slate-2': '#8a9bb0',
        'slate-3': '#5f7080',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:  ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
