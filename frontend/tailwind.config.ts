import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          input: "var(--bg-input)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          blue: "#3b82f6",
          "blue-dim": "rgba(59,130,246,0.12)",
          green: "#10b981",
          "green-dim": "rgba(16,185,129,0.12)",
          red: "#ef4444",
          "red-dim": "rgba(239,68,68,0.10)",
          amber: "#f59e0b",
          "amber-dim": "rgba(245,158,11,0.10)",
          purple: "#8b5cf6",
          "purple-dim": "rgba(139,92,246,0.10)",
          teal: "#06b6d4",
          "teal-dim": "rgba(6,182,212,0.10)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
