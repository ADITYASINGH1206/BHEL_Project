/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // Slate 900
        surface: '#1e293b', // Slate 800
        primary: '#3b82f6', // Blue 500
        secondary: '#10b981', // Emerald 500
        accent: '#8b5cf6', // Violet 500
        danger: '#ef4444', // Red 500
        textMain: '#f8fafc', // Slate 50
        textMuted: '#94a3b8', // Slate 400
      }
    },
  },
  plugins: [],
}
