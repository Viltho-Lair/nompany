"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Customizer, { PRESETS } from "./Customizer";

// The sidebar + header chrome. Client-side because the rail collapses, the
// mobile drawer opens and the customizer writes CSS custom properties — all of
// which are UI state. Page content is passed through as `children` and stays a
// server component.

const DEFAULTS = {
  preset: "ocean-blue",
  sidebarTheme: "dark",
  container: "fluid",
  dir: "ltr",
  captions: "show",
  collapsed: false,
};

const STORE_KEY = "super-customizer";

export default function Shell({ children, admin }) {
  const [state, setState] = useState(DEFAULTS);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Restore saved preferences after mount (never during render — the server
  // markup must match the defaults or hydration complains).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const set = useCallback((key, value) => setState((s) => ({ ...s, [key]: value })), []);
  const reset = useCallback(() => setState(DEFAULTS), []);

  const preset = PRESETS.find((p) => p.id === state.preset) || PRESETS[0];
  const accent = preset.value;

  const classes = [
    "admindek",
    "ad-scope",
    state.collapsed ? "ad-collapsed" : "",
    state.sidebarTheme === "light" ? "ad-sidebar-light" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      dir={state.dir}
      style={{
        // The accent preset overrides only the primary family, exactly like the
        // reference customizer does.
        "--ad-primary": accent,
        "--ad-ring": accent,
        "--ad-chart-1": accent,
        "--ad-sidebar-primary": accent,
      }}
    >
      <Sidebar
        collapsed={state.collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        hideCaptions={state.captions === "hide"}
      />

      <div
        className="ad-content flex min-h-screen flex-col transition-[margin] duration-300"
        style={{
          marginInlineStart: state.collapsed ? "var(--ad-sidebar-collapsed-width)" : "var(--ad-sidebar-width)",
        }}
      >
        <Header
          admin={admin}
          collapsed={state.collapsed}
          onToggleCollapse={() => set("collapsed", !state.collapsed)}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCustomizer={() => setCustomizerOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className={state.container === "boxed" ? "mx-auto w-full max-w-[1200px]" : "w-full"}>{children}</div>
        </main>
        <footer
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-[var(--ad-muted-foreground)] sm:px-6"
        >
          <span>© {new Date().getFullYear()} nompany — Super Admin Console</span>
          <span>Design preview · not wired to data</span>
        </footer>
      </div>

      <Customizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        state={state}
        set={set}
        onReset={reset}
      />

      {/* Captions toggle is a pure style concern, so it rides on a scoped rule
          rather than another class on every caption node. */}
      {state.captions === "hide" ? (
        <style>{`.admindek .ad-nav-caption{display:none}`}</style>
      ) : null}
    </div>
  );
}
