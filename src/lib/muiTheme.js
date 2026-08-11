import { createTheme } from "@mui/material/styles";

// MUI theme mapped onto the palette in DESIGN.md, so MUI components sit next to
// the hand-rolled Tailwind UI without a colour clash.
//
// Dark mode: `colorSchemeSelector: "class"` makes MUI emit its light variables
// under `:root` and its dark ones under `.dark` — the exact class the existing
// ThemeToggle + the no-flash script in the root layout already toggle on <html>.
// So MUI follows the site theme with no React state and no hydration mismatch.
//
// Fonts come from the `--font-*` CSS variables rather than literal families, so
// MUI picks up the Arabic typeface automatically when `[dir="rtl"]` swaps them.
const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  defaultColorScheme: "light",
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#2563eb", light: "#60a5fa", dark: "#1d4ed8", contrastText: "#ffffff" },
        // Secondary is the Geex purple accent, not the logo orange — the logo
        // colours are identity-only (see DESIGN.md).
        secondary: { main: "#8b3dde", light: "#a97ce8", dark: "#6a26b0", contrastText: "#ffffff" },
        success: { main: "#059669" },
        warning: { main: "#d97706" },
        error: { main: "#e11d48" },
        info: { main: "#0284c7" },
        background: { default: "#f8fafc", paper: "#ffffff" },
        text: { primary: "#0f172a", secondary: "#475569", disabled: "#94a3b8" },
        divider: "#e2e8f0",
      },
    },
    dark: {
      palette: {
        primary: { main: "#3b82f6", light: "#93c5fd", dark: "#2563eb", contrastText: "#0f172a" },
        secondary: { main: "#a97ce8", light: "#ede0fb", dark: "#7a2fca", contrastText: "#0f172a" },
        success: { main: "#059669" },
        warning: { main: "#d97706" },
        error: { main: "#e11d48" },
        info: { main: "#0284c7" },
        background: { default: "#0f172a", paper: "#1e293b" },
        text: { primary: "#f8fafc", secondary: "#94a3b8", disabled: "#64748b" },
        divider: "#334155",
      },
    },
  },
  typography: {
    fontFamily: "var(--font-body), system-ui, sans-serif",
    // 14px base matches the Studio's "Normal" size (0.875rem) from DESIGN.md.
    fontSize: 14,
    // Headings use the display face; the three Studio sizes (Title 1.75rem /
    // Heading 1rem / Normal 0.875rem) are enforced globally in globals.css under
    // `html.studio-chrome`, so these are the public-site scale.
    h1: { fontFamily: "var(--font-display), Saira, system-ui, sans-serif", fontWeight: 700 },
    h2: { fontFamily: "var(--font-display), Saira, system-ui, sans-serif", fontWeight: 700 },
    h3: { fontFamily: "var(--font-display), Saira, system-ui, sans-serif", fontWeight: 600 },
    h4: { fontFamily: "var(--font-display), Saira, system-ui, sans-serif", fontWeight: 600 },
    h5: { fontFamily: "var(--font-display), Saira, system-ui, sans-serif", fontWeight: 600 },
    h6: { fontFamily: "var(--font-display), Saira, system-ui, sans-serif", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    // The design language is flat + bordered (see the `geex` shadows in
    // tailwind.config.js), not Material elevation. Default MUI surfaces to
    // outlined/flat so they don't arrive looking foreign.
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: { defaultProps: { elevation: 0, variant: "outlined" } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
    MuiTextField: { defaultProps: { size: "small" } },
  },
});

export default theme;
