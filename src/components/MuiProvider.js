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
export default function MuiProvider({ children }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui", enableCssLayer: true }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
