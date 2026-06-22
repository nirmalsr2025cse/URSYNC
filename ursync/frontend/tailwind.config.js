/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        govblue: {
          50: "#eef4fb",
          100: "#d9e8f5",
          200: "#b3d1eb",
          300: "#80b3dd",
          400: "#4d8fcb",
          500: "#2670b3",
          600: "#1a5a96",
          700: "#134579",
          800: "#0e3760",
          900: "#0a2a49",
        },
        govgold: {
          400: "#e0a82e",
          500: "#c9921f",
        },
        /* Warm cream + terracotta palette, matching the card reference design */
        cream: {
          50: "#fdf6ee",
          100: "#fbeee0",
          200: "#f5ddc4",
        },
        rust: {
          50: "#fbeee5",
          100: "#f5dac8",
          400: "#c9794f",
          500: "#b1633c",
          600: "#974f2e",
          700: "#7a3f25",
          900: "#3d2013",
        },
        statusgreen: {
          text: "#1f7a4d",
          bg: "#d4f0dd",
          bar: "#34a853",
        },
        statusgold: {
          text: "#a4690a",
          bg: "#fbe4b6",
          bar: "#e0a82e",
        },
        statusred: {
          text: "#c23b3b",
          bg: "#f8d6d6",
          bar: "#e25c5c",
        },
      },
      fontFamily: {
        sans: ["Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(10, 42, 73, 0.08)",
        cardHover: "0 6px 18px rgba(10, 42, 73, 0.16)",
      },
    },
  },
  plugins: [],
};
