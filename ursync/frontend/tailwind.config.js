/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tn: {
          navy:    '#0A2240',   // was #0A2240 — your red, used for headings/nav
          blue:    '#1A4A8C',   // was #1A4A8C — your red, used for links/buttons
          sky:     '#F62440',   // was #2E7FD9 — focus rings
          gold:    '#FFE5BF',   // was #D4A017 — accent/highlight
          amber:   '#FFF2DB',   // was #F5A623 — secondary accent
          cream:   '#FFFAF3',   // was #F8F4EC — page background
          light:   '#FFF2DB',   // was #EEF4FB — card/sidebar hover bg
          muted:   '#C47A8A',   // was #6B7A8D — subtle text
          border:  '#FFE5BF',   // was #D1DCE8 — borders
          success: '#1A7A3C',   // keep green for "Open" status badges
          danger:  '#C0392B',   // keep red for "Closed" badges
          warn:    '#E67E22',   // keep orange for warnings
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Merriweather', 'Georgia', 'serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in':  'fadeIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.5 },
        },
      },
    },
  },
  plugins: [],
}