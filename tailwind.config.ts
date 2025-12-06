import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "purple-pulse": {
          "0%": { backgroundColor: "#F3E8FF" },
          "50%": { backgroundColor: "#D8B4FE" },
          "100%": { backgroundColor: "#FFFFFF" },
        },
        "green-flash": {
          "0%": { backgroundColor: "#DCFCE7" },
          "100%": { backgroundColor: "#FFFFFF" },
        },
        // Red to green transition (critical/duplicate resolved)
        "red-to-green": {
          "0%": { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
          "40%": { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
          "100%": { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
        },
        // Orange to green transition (duplicate resolved)
        "orange-to-green": {
          "0%": { backgroundColor: "#FFEDD5", borderColor: "#FDBA74" },
          "40%": { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
          "100%": { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
        },
        // Yellow to green transition (AI suggestion applied)
        "yellow-to-green": {
          "0%": { backgroundColor: "#FEF9C3", borderColor: "#FDE047" },
          "40%": { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
          "100%": { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
        },
        // Validated state pulse (green highlight then fade)
        "validated-pulse": {
          "0%": { backgroundColor: "#DCFCE7", boxShadow: "0 0 0 2px #22C55E" },
          "50%": { backgroundColor: "#F0FDF4", boxShadow: "0 0 0 1px #86EFAC" },
          "100%": { backgroundColor: "#FFFFFF", boxShadow: "none" },
        },
        // Validated slow fade to neutral over 5s
        "validated-fade": {
          "0%": { backgroundColor: "#ECFDF3", borderColor: "#22C55E" },
          "50%": { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" },
          "100%": { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
        },
        // Skipped state (gray out)
        "skip-fade": {
          "0%": { backgroundColor: "#FFEDD5", opacity: "1" },
          "100%": { backgroundColor: "#F9FAFB", opacity: "0.6" },
        },
        // Slide in from left for value change
        "slide-in-value": {
          "0%": { transform: "translateX(-8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "purple-pulse": "purple-pulse 2s ease-out",
        "green-flash": "green-flash 0.3s ease-out",
        "red-to-green": "red-to-green 1.2s ease-out forwards",
        "orange-to-green": "orange-to-green 1.2s ease-out forwards",
        "yellow-to-green": "yellow-to-green 1s ease-out forwards",
        "validated-pulse": "validated-pulse 1.5s ease-out forwards",
        "validated-fade": "validated-fade 1s ease-out forwards",
        "skip-fade": "skip-fade 0.5s ease-out forwards",
        "slide-in-value": "slide-in-value 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
