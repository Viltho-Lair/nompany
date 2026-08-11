/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    // lib holds Tailwind class strings too (e.g. dashboard widget grid spans),
    // so it must be scanned or those classes get purged.
    "./src/lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // nompany brand — royal blue (from the ERP Color Palette spec).
        // Primary #2563EB (blue-600); dark-mode primary #3B82F6 (blue-500).
        // Mapped onto the Tailwind blue scale so every existing `brand-*` class
        // adopts the new palette without touching each component.
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd", // light accent on dark surfaces
          400: "#60a5fa", // legible on dark
          500: "#3b82f6", // dark-mode primary
          600: "#2563eb", // PRIMARY brand
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Neutrals — desaturated blue-gray (Slate) for data-dense, low-fatigue
        // surfaces. Kept under the legacy `steel` name so existing classes work;
        // values are the Tailwind slate scale from the palette spec.
        steel: {
          50: "#f8fafc",  // app background (light)
          100: "#f1f5f9",
          200: "#e2e8f0", // borders / lines (light)
          300: "#cbd5e1",
          400: "#94a3b8", // secondary text (dark) / muted
          500: "#64748b",
          600: "#475569", // secondary text (light)
          700: "#334155", // borders / lines (dark)
          800: "#1e293b", // surface / cards (dark)
          900: "#0f172a", // app background (dark) / deep sections
        },
        // Semantic status colors (ERP statuses) — used by status pills across
        // the studio + /super console. In dark mode, use these at ~15% opacity
        // for backgrounds and full strength for text/icons.
        success: "#059669", // Emerald — Approved
        warning: "#d97706", // Amber — Pending
        danger: "#e11d48",  // Rose — Failed
        info: "#0284c7",    // Sky — In Progress
        // Geex "Control Panel" secondary accent (purple) — used as a highlight
        // alongside the MegaTech blue primary. Plus the design's light page/
        // surface tones so the Studio matches the Figma system.
        accent: {
          50: "#f5edfd",
          100: "#ede0fb",
          400: "#a97ce8",
          500: "#8b3dde",
          600: "#7a2fca",
          700: "#6a26b0",
        },
        geex: {
          bg: "#f4f5fa",      // page background (light)
          card: "#ffffff",    // surface
          ink: "#2b2b40",     // body text (dark navy)
        },
      },
      boxShadow: {
        geex: "0 14px 40px -18px rgba(20, 30, 72, 0.16)",
        "geex-sm": "0 8px 22px -14px rgba(20, 30, 72, 0.16)",
      },
      borderRadius: {
        geex: "20px",
      },
      fontFamily: {
        display: ["var(--font-display)", "Saira", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
        800: "800",
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.25" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 3.5s ease-out infinite",
        fadeUp: "fadeUp 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};
