import type { Config } from "tailwindcss";

import typography from "@tailwindcss/typography"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Expense category colors (D1, docs/DESIGN_SYSTEM.md) ──
        cat: {
          stay: "hsl(var(--cat-stay))",
          transport: "hsl(var(--cat-transport))",
          food: "hsl(var(--cat-food))",
          activity: "hsl(var(--cat-activity))",
          gift: "hsl(var(--cat-gift))",
          shopping: "hsl(var(--cat-shopping))",
          other: "hsl(var(--cat-other))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Active-state tint (tabs, date circles, nav) — DESIGN.md §2.1
          soft: "hsl(var(--primary-soft))",
          "soft-foreground": "hsl(var(--primary-soft-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        "destructive-bg": "hsl(var(--destructive-bg))",
        // Text on top of the (always dark) trip cover — DESIGN.md §2.4
        "on-cover": "hsl(var(--on-cover))",
        "cover-button": {
          DEFAULT: "hsl(var(--cover-button))",
          foreground: "hsl(var(--cover-button-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // ── Semantic status tokens (warning / info / success) ──
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        "warning-bg": "hsl(var(--warning-bg))",
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        "info-bg": "hsl(var(--info-bg))",
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        "success-bg": "hsl(var(--success-bg))",
      },
      // DESIGN.md §4.1: pills and circles for controls, 16 → 32px for surfaces.
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "calc(var(--radius) - 8px)", // 8px
        md: "calc(var(--radius) - 4px)", // 12px
        lg: "var(--radius)", // 16px: rows, inputs, thumbnails
        xl: "1.375rem", // 22px: cards
        "2xl": "1.75rem", // 28px: panels, boarding pass, map, sheet
        "3xl": "2rem", // 32px: hero, mobile cover
        "4xl": "2.5rem",
        full: "9999px",
      },
      spacing: {
        // Content width cap (DESIGN.md §4.3): wide enough for 27" monitors; the
        // trip map and grids grow into it.
        "max-width": "1920px",
        "margin-mobile": "1rem",
        "margin-desktop": "2.5rem",
        "unit": "4px",
        "gutter": "1.5rem",
        "6": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        // coss ui titles (CardTitle, DialogTitle) use font-heading
        heading: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        overlay: "var(--shadow-overlay)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  safelist: [
    "grid-cols-1",
    "grid-cols-2",
    "grid-cols-3",
    "grid-cols-4",
    "md:grid-cols-2",
    "lg:grid-cols-3",
    "md:grid-cols-4",
    "gap-6",
  ],
  plugins: [typography],
};
export default config;
