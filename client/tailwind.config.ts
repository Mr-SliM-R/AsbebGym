import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: {
          950: "#05070b",
          900: "#090d14",
          850: "#0d131d",
          800: "#111927"
        },
        rival: {
          green: "#40ff9a",
          cyan: "#39d7ff",
          rose: "#ff4f7b",
          amber: "#ffc857"
        }
      },
      boxShadow: {
        neon: "0 0 32px rgba(64, 255, 154, 0.18)",
        cyan: "0 0 32px rgba(57, 215, 255, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;
