/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palantir-inspired dark theme
        void: '#0d0d0f',
        'void-light': '#121214',
        'void-lighter': '#17171a',
        border: '#2a2a2f',
        'text-muted': '#8a8a92',
        'text-bright': '#e5e7eb',
        accent: '#5c6068',
        'accent-hover': '#464a52',
        success: '#0F9960',
        warning: '#FFB000',
        critical: '#FF4D4F',
        // Code editor colors
        'code-bg': '#0a0e12',
        'code-keyword': '#c678dd',
        'code-string': '#98c379',
        'code-function': '#61afef',
        'code-variable': '#e06c75',
        'code-number': '#d19a66',
        'code-comment': '#7f848e',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Instrument Serif', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
