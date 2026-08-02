/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fg: {
          mango: "#F59E0B",
          sage: "#10B981",
          soil: "#78350f",
          night: "#0f172a",
        },
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
