/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        card: '#141414',
        primary: '#F5C518',
        secondary: '#E8F318',
        textPrimary: '#FFFFFF',
        textSecondary: '#888888',
        danger: '#FF4444',
        success: '#44DD88',
        border: '#2A2A2A',
      },
    },
  },
  plugins: [],
};
