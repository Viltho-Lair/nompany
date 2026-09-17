"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";

// A SHARED bottom-bar panel-switcher — the same strip as the Operations bottom
// bar, lifted out so any screen can flip between in-place panels without a
// navigation. It is deliberately NOT a set of links: the active panel is kept in
// the URL query string so a refresh or a deep link reopens the same panel, but
// the switch itself is a pure in-place re-render, never a page load.
//
// Two exports:
//   usePanelParam(param, defaultKey, keys) — the URL-remembered active key
//   PanelBar({ items, active, onSelect })   — the presentational strip
//
// Every bottom bar in the studio is drawn by BottomBar below — the panel
// switcher, the Operations bar and the project-sheets bar — so there is one
// answer to where a bar starts and what happens on a narrow screen.

// Reads the wanted key out of ?<param>= at call time. Guarded for SSR — there is
// no window on the server, so we hand back the default and let the client settle
// it on mount. If the URL carries a value that is not one of `keys`, we ignore it
// rather than render an unknown panel.
function readParam(param, defaultKey, keys) {
  if (typeof window === "undefined") return defaultKey;
  const value = new URLSearchParams(window.location.search).get(param);
  return value && keys.includes(value) ? value : defaultKey;
}

// The active panel lives in React state SEEDED from the URL, so switching is an
// ordinary re-render. setActive both moves the state and rewrites the query with
// history.replaceState — replace, not push, so the switcher does not stack a back
// entry per click, while a refresh or a copied link still lands on the same panel.
export function usePanelParam(param, defaultKey, keys) {
  const [active, setState] = useState(() => readParam(param, defaultKey, keys));

  const setActive = useCallback((key) => {
    if (!keys.includes(key)) return;
    setState(key);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (key === defaultKey) url.searchParams.delete(param);
    else url.searchParams.set(param, key);
    window.history.replaceState(window.history.state, "", url);
    // param and keys are stable per screen; re-binding on identity is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, defaultKey]);

  return [active, setActive];
}

// THE SHELL EVERY BOTTOM BAR SHARES.
//
// IT STARTS WHERE THE PAGE DOES. The bars used `lg:start-72` (18rem) from when
// the sidebar was that wide; it is 21.5rem inset by 1rem now, the content
// starts at 23.5rem (StudioFrame), and every bar slid under the sidebar's edge.
// The inset matches the content's own `lg:ps-[23.5rem]` — change them together.
//
// IT TELLS THE CORNER BUTTONS IT IS THERE. Nova and live chat float in the
// bottom corner and covered the bar's end, which held the controls a narrow
// screen most needs. While any bar is mounted, <html data-bottom-bar> is set,
// and the launchers lift above it (NovaLauncher, StudioChat) — so the bar keeps
// the full width at every size rather than reserving a corner it may not need.
//
// `scroll` lets the row scroll sideways when it is wider than the screen. The
// sheets bar leaves it off: its own tab rack scrolls, and an overflow container
// would clip the menus that open from it.
let mounted = 0;
export const BottomBar = forwardRef(function BottomBar(
  { children, sidebarInset = true, scroll = false, rowClass = "gap-2 px-3" }, ref,
) {
  useEffect(() => {
    mounted += 1;
    document.documentElement.dataset.bottomBar = "";
    return () => {
      mounted -= 1;
      if (!mounted) delete document.documentElement.dataset.bottomBar;
    };
  }, []);
  return (
    <div ref={ref} className={`pointer-events-none fixed bottom-0 end-0 start-0 z-30 ${sidebarInset ? "lg:start-[23.5rem]" : ""}`}>
      <div className="mx-auto max-w-[1400px] px-3 sm:px-8">
        <div className={`pointer-events-auto flex min-w-0 items-center rounded-t-geex border border-b-0 border-slate-200 bg-white/95 py-2 shadow-geex backdrop-blur dark:border-white/10 dark:bg-[#20202c]/95 ${scroll ? "bar-scroll overflow-x-auto" : ""} ${rowClass}`}>
          {children}
        </div>
      </div>
    </div>
  );
});

// Presentational only. `items` is [{key,label}]. The active item is a
// non-clickable aria-current span; the rest are buttons. No links, no hrefs — the
// caller owns what onSelect does, which for a PanelBar is always an in-place flip.
// `sidebarInset` is the studio's own left gutter, and it is a PROP rather than a
// constant because the Pulse wall is full-bleed: it renders outside the console
// chrome, so a bar reserving 288px for a sidebar that is not there sits visibly
// off-centre. Default unchanged, so every existing caller is untouched.
export function PanelBar({ items, active, onSelect, sidebarInset = true }) {
  return (
    <BottomBar sidebarInset={sidebarInset} scroll>
      {items.map((i) => {
        const on = i.key === active;
        // shrink-0 + nowrap: on a narrow screen the row scrolls; a pill never
        // squeezes its label onto two lines.
        const cls = `shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-display text-sm font-600 transition-colors ${
          on ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`;
        if (on) return <span key={i.key} className={cls} aria-current="page">{i.label}</span>;
        return <button key={i.key} type="button" className={cls} onClick={() => onSelect(i.key)}>{i.label}</button>;
      })}
    </BottomBar>
  );
}

export default PanelBar;
