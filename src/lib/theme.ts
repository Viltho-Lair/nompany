// THE ONE PLACE THE THEME IS READ, WRITTEN AND APPLIED.
//
// It existed twice, and the two copies disagreed — which is the shape this
// codebase's house rule is about, caught here with a real consequence rather
// than in the abstract.
//
// `components/ThemeToggle.js` toggled BOTH `dark` and `light` on <html> and
// wrote `mui-mode`; `app/super/_components/Header.js` (deleted 10/09/2026 with
// the console's sidebar — the Pulse chrome replaced both) toggled `dark` alone and
// wrote neither. MUI scopes its light variables to `.light` and its dark ones to
// `.dark`, so a stale `light` left behind lights every MUI control on a dark
// page — and the marketing site adds that class while the console never removed
// it. A person who set the theme on the public site and then flipped it in the
// console got exactly that.
//
// The ThemeToggle behaviour is the correct one and is what survives here. Both
// callers adopt it, and the Pulse wall was the third caller that would otherwise
// have made a third copy.
//
// BROWSER-ONLY, deliberately not a hook: the wall reads it from a keyboard
// handler and the toggles read it from an effect, so a hook would force one of
// them into a shape it does not want. Every function guards for the server,
// because a Server Component importing this by accident should be a no-op rather
// than a crash.

export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

export function readTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  try {
    const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    if (m) {
      const value = decodeURIComponent(m[1]) as ThemeMode;
      if (THEME_MODES.includes(value)) return value;
    }
    // No explicit choice yet — fall back to whatever the no-flash script in the
    // root layout already resolved, so a control never contradicts the page it
    // is sitting on (that default is per-surface: dark on marketing, light in
    // the app).
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `theme=${mode}; path=/; max-age=31536000; samesite=lax${secure}`;
    // MUI's CssVarsProvider is the other writer of the `dark` class, and it
    // prefers its own persisted mode over the `defaultMode` the server passes.
    // Writing its key here means the two can never disagree — whichever runs
    // first on the next load reaches the same answer.
    localStorage.setItem("mui-mode", mode);
  } catch { /* a blocked cookie store costs the preference, never the page */ }
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && sys);
  // BOTH CLASSES, not just `dark` — see the header of this file. This is the
  // half the console's copy was missing.
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
}

// Choose, persist and apply in one act, which is what every caller actually
// wants and what both copies open-coded.
export function chooseTheme(mode: ThemeMode) {
  writeTheme(mode);
  applyTheme(mode);
}
