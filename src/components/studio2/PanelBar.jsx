"use client";

import { useCallback, useState } from "react";

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
// The bar's look is copied verbatim from OperationsBottomBar (StudioOperations):
// a pointer-events-none fixed strip that never covers the sidebar (lg:start-72),
// a rounded-top white/dark card of pills, active pill = bg-brand-700 text-white.

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

// Presentational only. `items` is [{key,label}]. The active item is a
// non-clickable aria-current span; the rest are buttons. No links, no hrefs — the
// caller owns what onSelect does, which for a PanelBar is always an in-place flip.
export function PanelBar({ items, active, onSelect }) {
  return (
    <div className="pointer-events-none fixed bottom-0 end-0 start-0 z-30 lg:start-72">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="pointer-events-auto flex items-center gap-2 rounded-t-geex border border-b-0 border-slate-200 bg-white/95 px-3 py-2 shadow-geex backdrop-blur dark:border-white/10 dark:bg-[#20202c]/95">
          {items.map((i) => {
            const on = i.key === active;
            const cls = `rounded-full px-4 py-1.5 font-display text-sm font-600 transition-colors ${
              on ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`;
            if (on) return <span key={i.key} className={cls} aria-current="page">{i.label}</span>;
            return <button key={i.key} type="button" className={cls} onClick={() => onSelect(i.key)}>{i.label}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

export default PanelBar;
