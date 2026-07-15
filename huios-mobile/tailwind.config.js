/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#135bec',
        'primary-dark': '#0e46c0',
        'primary-deep': '#082f7a',
        'primary-soft': '#e8f0ff',
        surface: '#ffffff',
        background: '#f8fafc',
        success: '#15803d',
        'success-soft': '#dcfce7',
        warning: '#a16207',
        'warning-soft': '#fef3c7',
        danger: '#b91c1c',
        'danger-soft': '#fee2e2',
      },
      borderRadius: {
        card: '1rem',
        button: '0.75rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
