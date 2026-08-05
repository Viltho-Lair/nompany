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
        // Brand blues (from the supplied Icon Colors sheet)
        brand: {
          950: "#031f5d", // darkest navy
          900: "#022e72",
          700: "#02438f",
          600: "#024a9c",
          500: "#0159ae", // bright blue
          400: "#3d84d6", // lighter blue — legible on dark surfaces
          300: "#74abea", // light blue — active/hover accents in dark mode
        },
        // Brand greys (from the supplied Icon Colors sheet)
        steel: {
          400: "#8f8f8f",
          500: "#767677",
          700: "#5c5c5e",
        },
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
