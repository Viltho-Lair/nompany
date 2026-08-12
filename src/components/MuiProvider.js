"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/lib/muiTheme";

// App-wide MUI setup, mounted in the root layout.
//
// `enableCssLayer` wraps every MUI-generated rule in `@layer mui`. Tailwind v3
// emits its utilities unlayered, and unlayered CSS always beats layered CSS —
// so `className="..."` on a MUI component wins without `!important` or `sx`
// gymnastics. This is what makes Tailwind + shadcn + MUI coexist here.
//
// Deliberately no <CssBaseline />: Tailwind's preflight is already the reset,
// and globals.css owns <body> (the dark gradient backdrop, the font stack, the
// heading colours). Adding MUI's baseline on top would fight all three.
//
// `mode` MUST be passed the theme the server already resolved from the cookie.
// With `colorSchemeSelector: "class"` MUI does not merely read `.dark` — its
// CssVarsProvider OWNS that class and writes it to <html> in a layout effect on
// every mount. Left to itself it defaults to "system", so it would overwrite the
// server's cookie-resolved class with the visitor's OS preference a moment after
// hydration: a saved Light choice appeared to work, then reverted to dark on the
// next refresh. Feeding it the same value keeps the two in agreement, and MUI
// stays the single writer of the class rather than a competing one.
export default function MuiProvider({ mode = "light", children }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui", enableCssLayer: true }}>
      <ThemeProvider theme={theme} defaultMode={mode}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
