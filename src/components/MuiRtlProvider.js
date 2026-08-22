"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import theme from "@/lib/muiTheme";

// MUI, MIRRORED — the missing half of Arabic support.
//
// Everything in the studio that is hand-written mirrors already: `dir="rtl"` on
// the shell flips ps-/pe-, ms-/me- and border-s-, because those are logical
// properties and the browser owns them. MUI is different. It emits physical
// CSS — `padding-left`, `margin-right`, `left: 0` — from Emotion at runtime, so
// no attribute can flip it. Until now the Data Grid, the date/time pickers and
// Autocomplete rendered left-to-right inside an Arabic page: a known gap, and
// this is the thing that closes it.
//
// TWO HALVES, AND BOTH ARE NEEDED.
//
//   1. `stylisPlugins: [prefixer, rtlPlugin]` rewrites the CSS as Emotion
//      serialises it — padding-left becomes padding-right and so on. Without
//      it, `direction: rtl` alone reverses the text and leaves the box model
//      pointing the wrong way, which is worse than not mirroring at all.
//   2. `direction: "rtl"` on the THEME, because MUI components read it in
//      JavaScript as well as in CSS: which edge a Drawer anchors to, which way
//      Tabs scroll, which arrow the Data Grid's sort indicator draws.
//
// THE LAYER IS NOT OPTIONAL. `enableCssLayer` wraps every rule in `@layer mui`,
// and globals.css declares `@layer tw-base, tw-components, mui, tw-utilities` —
// so Tailwind's preflight sits BELOW MUI and its utilities ABOVE. Unlayered CSS
// beats layered CSS outright, so an RTL cache without this would emit MUI rules
// that no `className` could override, and Tailwind's preflight would collapse
// MUI's text fields. It is applied in `cache.insert`, independently of
// `stylisPlugins`, so the two compose rather than competing.
//
// A SECOND CACHE, WITH ITS OWN KEY. `key: "muirtl"` gives the generated class
// names their own prefix, so an RTL studio's rules cannot collide with the
// root provider's LTR ones in the same document — which matters because the
// root layout mounts MuiProvider app-wide and this nests inside it.
// AND IT TAKES NO `mode`, WHICH IS THE POINT WORTH CHECKING BEFORE NESTING.
//
// MuiProvider's own note explains that MUI OWNS the `.dark` class: left to
// itself it defaults to "system" and overwrites the class the server resolved
// from the cookie, so a saved Light choice reverts on the next refresh. A second
// ThemeProvider that also owned the class would bring that straight back.
//
// It does not. Read rather than assumed — createCssVarsProvider detects an outer
// provider and, when nested, takes `mode` and `colorScheme` from it and returns
// without supplying a ColorSchemeContext of its own. So the root provider stays
// the single writer, `defaultMode` here would be ignored, and the honest thing
// is not to accept one.
const rtlTheme = createTheme(theme, { direction: "rtl" });

export default function MuiRtlProvider({ children }) {
  return (
    <AppRouterCacheProvider
      options={{ key: "muirtl", enableCssLayer: true, stylisPlugins: [prefixer, rtlPlugin] }}
    >
      <ThemeProvider theme={rtlTheme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
