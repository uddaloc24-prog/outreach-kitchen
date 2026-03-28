/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#F6F1E9",
        gold: "#B8955A",
        rust: "#9B3D2B",
        ink: "#1C1814",
        muted: "#5C4F43",
        "warm-border": "#DDD6CB",
        "dark-surface": "#1A1714",
        "success-green": "#3A6B4A",
        surface: "#FFFFFF",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-karla)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        full: "9999px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.06)",
        panel: "0 0 48px rgba(0,0,0,0.12)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-up-1": "fadeUp 0.4s ease 0.1s forwards",
        "fade-up-2": "fadeUp 0.4s ease 0.2s forwards",
        "fade-up-3": "fadeUp 0.4s ease 0.3s forwards",
        "slide-in": "slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        "status-pulse": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
