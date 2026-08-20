/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    // ts/tsx as well as js/jsx: the document application is TypeScript, and a
    // class Tailwind never sees is a class that does not exist.
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    // lib holds Tailwind class strings too (e.g. dashboard widget grid spans),
    // so it must be scanned or those classes get purged.
    "./src/lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- the document application's semantic tokens ------------------
        //
        // The document editor was built against shadcn's vocabulary — bg-card,
        // text-muted-foreground, border-border. Rather than rewrite every one
        // of those classNames, the vocabulary is registered here and pointed at
        // the studio's own palette in globals.css. The components keep their
        // shape and adopt the studio's colour, which is the whole of what
        // "adapt the studio design" means.
        //
        // Every one of these is new: nothing in the studio used these names, so
        // no existing class changes meaning. `accent` is deliberately absent —
        // the studio already owns that name for its purple scale — and the few
        // places the port reached for it now ask for `muted` instead.
        background: "rgb(var(--doc-background) / <alpha-value>)",
        foreground: "rgb(var(--doc-foreground) / <alpha-value>)",
        card: "rgb(var(--doc-card) / <alpha-value>)",
        "card-foreground": "rgb(var(--doc-card-foreground) / <alpha-value>)",
        popover: "rgb(var(--doc-popover) / <alpha-value>)",
        "popover-foreground": "rgb(var(--doc-popover-foreground) / <alpha-value>)",
        primary: "rgb(var(--doc-primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--doc-primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--doc-secondary) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--doc-secondary-foreground) / <alpha-value>)",
        muted: "rgb(var(--doc-muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--doc-muted-foreground) / <alpha-value>)",
        destructive: "rgb(var(--doc-destructive) / <alpha-value>)",
        "destructive-foreground": "rgb(var(--doc-destructive-foreground) / <alpha-value>)",
        border: "rgb(var(--doc-border) / <alpha-value>)",
        input: "rgb(var(--doc-input) / <alpha-value>)",
        ring: "rgb(var(--doc-ring) / <alpha-value>)",

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
        // ---- Public landing page ----------------------------------------
        // The landing page has its own palette, separate from the app's. Two
        // tokens are renamed to avoid colliding: its indigo accent is `iris`
        // (the app's `brand` is the royal-blue scale above) and its amber is
        // `gold` (the app has live `amber-*` usages).
        //
        // Each is `rgb(var(--…-rgb) / <alpha-value>)` rather than a literal,
        // for two reasons at once: opacity modifiers like `bg-iris/20` still
        // compile, AND the values follow the light/dark channel triples
        // defined in globals.css. Never inline a hex here — that would freeze
        // the page in one theme.
        ink: {
          DEFAULT: "rgb(var(--color-ink-rgb) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft-rgb) / <alpha-value>)",
          card: "rgb(var(--color-ink-card-rgb) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--color-line-rgb) / <alpha-value>)",
          soft: "rgb(var(--color-line-soft-rgb) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--color-fg-rgb) / <alpha-value>)",
          muted: "rgb(var(--color-fg-muted-rgb) / <alpha-value>)",
          dim: "rgb(var(--color-fg-dim-rgb) / <alpha-value>)",
        },
        iris: {
          DEFAULT: "rgb(var(--color-iris-rgb) / <alpha-value>)",
          bright: "rgb(var(--color-iris-bright-rgb) / <alpha-value>)",
        },
        violet: "rgb(var(--color-violet-rgb) / <alpha-value>)",
        cyan: "rgb(var(--color-cyan-rgb) / <alpha-value>)",
        mint: "rgb(var(--color-mint-rgb) / <alpha-value>)",
        gold: "rgb(var(--color-gold-rgb) / <alpha-value>)",
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
        // ---- Landing page ambient motion ------------------------------
        // Transform/opacity only, so the compositor owns every frame and
        // the main thread stays free for scroll + React work.
        "blob-drift-a": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(6%, -4%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-4%, 5%, 0) scale(0.96)" },
        },
        "blob-drift-b": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.04)" },
          "40%": { transform: "translate3d(-7%, 6%, 0) scale(0.94)" },
          "75%": { transform: "translate3d(5%, 3%, 0) scale(1.1)" },
        },
        "blob-drift-c": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(0.98)" },
          "50%": { transform: "translate3d(4%, 7%, 0) scale(1.12)" },
        },
        // One tile of travel, so the infinite grid loop is seamless.
        "grid-pan": {
          from: { transform: "translate3d(0, 0, 0)" },
          to: { transform: "translate3d(0, 80px, 0)" },
        },
        shimmer: {
          from: { transform: "translate3d(-100%, 0, 0)" },
          to: { transform: "translate3d(100%, 0, 0)" },
        },
        "caret-blink": {
          "0%, 45%": { opacity: "1" },
          "50%, 95%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        pulseRing: "pulseRing 3.5s ease-out infinite",
        fadeUp: "fadeUp 0.7s ease-out both",
        "blob-a": "blob-drift-a 26s var(--ease-in-out-soft) infinite",
        "blob-b": "blob-drift-b 32s var(--ease-in-out-soft) infinite",
        "blob-c": "blob-drift-c 38s var(--ease-in-out-soft) infinite",
        "grid-pan": "grid-pan 6s linear infinite",
        shimmer: "shimmer 1.6s var(--ease-in-out-soft) infinite",
        caret: "caret-blink 1.1s steps(1, end) infinite",
      },
    },
  },
  // The ported dialogs, dropdowns and popovers animate through data-state
  // attributes; without this their transition classes compile to nothing and
  // every overlay snaps.
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
