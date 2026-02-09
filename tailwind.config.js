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
        void: '#10161a',
        'void-light': '#141d25',
        'void-lighter': '#1b262e',
        border: '#2b3b47',
        'text-muted': '#8a9ba8',
        'text-bright': '#d3e2ee',
        accent: '#2D72D2',
        'accent-hover': '#255dad',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
