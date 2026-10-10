/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B141C",
        panel: "#131E29",
        panelLight: "#1B2A38",
        line: "#233443",
        signal: "#2DD9C4",
        amber: "#F5A623",
        coral: "#FF5D7A",
        paper: "#EAF2F5",
        mist: "#7E93A3",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
}
