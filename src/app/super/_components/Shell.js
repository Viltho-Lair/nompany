"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Customizer from "./Customizer";
import SuperLiveProvider from "@/components/super/SuperLiveProvider";

// The sidebar + header chrome. Client-side because the rail collapses, the
// mobile drawer opens and the settings drawer writes classes — all of which are
// UI state. Page content is passed through as `children` and stays a server
// component.
//
// The shell no longer carries an inline `style` block. It used to write
// `--ad-primary`, `--ad-ring`, `--ad-chart-1` and `--ad-sidebar-primary` from a
// saved accent preset, which meant the console's brand colour was a value in
// localStorage: an inline style beats every stylesheet, so a preference set once
// silently outranked the design system on every later visit. The accent is the
// brand's, decided in globals.css, and there is nothing left here to override it
// with. See Customizer for the rest of that removal.

const DEFAULTS = {
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
  // markup must match the defaults or hydration complains). Only the four keys
  // that still exist are read: a browser holding the old shape would otherwise
  // restore `preset` and `sidebarTheme` into state that nothing consumes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setState((s) => {
        const next = { ...s };
        for (const k of Object.keys(DEFAULTS)) {
          if (saved[k] !== undefined) next[k] = saved[k];
        }
        return next;
      });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const set = useCallback((key, value) => setState((s) => ({ ...s, [key]: value })), []);
  const reset = useCallback(() => setState(DEFAULTS), []);

  const classes = ["admindek", "ad-scope", state.collapsed ? "ad-collapsed" : ""].filter(Boolean).join(" ");

  return (
    // The console's one live connection, opened on the shell so the header's
    // bell and every page below share it — see SuperLiveProvider for why it is
    // one per tab rather than one per consumer.
    <SuperLiveProvider>
      <div className={classes} dir={state.dir}>
        <Sidebar
          collapsed={state.collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          hideCaptions={state.captions === "hide"}
        />

        {/* The offset is `rail width + both insets`, computed in super.css from
            the same two numbers the rail is sized from, so the floating rail and
            the margin beside it cannot drift apart. It is set THERE and not here:
            an inline style would beat the `@media (max-width: 1023px)` rule that
            collapses the margin to zero on small screens, which is how the
            content ends up 288px off the side of a phone. */}
        <div className="ad-content flex min-h-screen flex-col transition-[margin] duration-300">
          <Header
            admin={admin}
            collapsed={state.collapsed}
            onToggleCollapse={() => set("collapsed", !state.collapsed)}
            onOpenMobile={() => setMobileOpen(true)}
            onOpenCustomizer={() => setCustomizerOpen(true)}
          />
          <main className="flex-1 px-4 pb-8 sm:px-6">
            <div className={state.container === "boxed" ? "mx-auto w-full max-w-[1200px]" : "w-full"}>{children}</div>
          </main>
          <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-[var(--ad-muted-foreground)] sm:px-6">
            <span>© {new Date().getFullYear()} nompany — Super Admin Console</span>
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
        {state.captions === "hide" ? <style>{`.admindek .ad-nav-caption{display:none}`}</style> : null}
      </div>
    </SuperLiveProvider>
  );
}
