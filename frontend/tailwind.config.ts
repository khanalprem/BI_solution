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
          base:         "var(--bg-base)",
          surface:      "var(--bg-surface)",
          card:         "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          input:        "var(--bg-input)",
        },
        "row-hover":        "var(--row-hover)",
        "row-hover-strong": "var(--row-hover-strong)",
        border: {
          DEFAULT: "var(--border)",
          strong:  "var(--border-strong)",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
        },
        accent: {
          // Solid accent colours — same in both themes
          blue:   "#6366F1",
          green:  "#10B981",
          red:    "#F43F5E",
          amber:  "#F59E0B",
          purple: "#8B5CF6",
          teal:   "#14B8A6",
          // Dim variants — CSS vars so light/dark theme overrides work
          "blue-dim":   "var(--accent-blue-dim)",
          "green-dim":  "var(--accent-green-dim)",
          "red-dim":    "var(--accent-red-dim)",
          "amber-dim":  "var(--accent-amber-dim)",
          "purple-dim": "var(--accent-purple-dim)",
          "teal-dim":   "var(--accent-teal-dim)",
        },
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "3xs":  ["9px",  { lineHeight: "13px" }],
        "2xs":  ["11px", { lineHeight: "15px" }],
        xs:     ["12px", { lineHeight: "16px" }],
        sm:     ["13px", { lineHeight: "19px" }],
        base:   ["14px", { lineHeight: "21px" }],
        lg:     ["18px", { lineHeight: "26px" }],
        xl:     ["22px", { lineHeight: "30px" }],
        "2xl":  ["28px", { lineHeight: "36px" }],
        "3xl":  ["36px", { lineHeight: "44px" }],
      },
      borderRadius: {
        sm:      "6px",
        DEFAULT: "10px",
        lg:      "14px",
        xl:      "16px",
        "2xl":   "20px",
        full:    "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
