"use client";

import { useEffect, useState } from "react";

// Toggles the `dir` attribute on <html> between "ltr" and "rtl" and remembers
// the choice in localStorage under `studio-dir`. Studio labels stay in English;
// this only mirrors the layout so Arabic-first admins can work RTL.
export default function StudioDirToggle() {
  const [rtl, setRtl] = useState(false);

  useEffect(() => {
    // Apply any saved preference and sync local state.
    let initial = document.documentElement.getAttribute("dir") === "rtl";
    try {
      const saved = localStorage.getItem("studio-dir");
      if (saved === "rtl" || saved === "ltr") {
        initial = saved === "rtl";
        document.documentElement.setAttribute("dir", saved);
        document.documentElement.setAttribute("lang", saved === "rtl" ? "ar" : "en");
      }
    } catch {}
    setRtl(initial);
  }, []);

  function toggle() {
    const next = !rtl;
    const dir = next ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", next ? "ar" : "en");
    try {
      localStorage.setItem("studio-dir", dir);
    } catch {}
    setRtl(next);
  }

  const label = rtl ? "Switch to left-to-right" : "Switch to right-to-left";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--geex-surface)] px-3.5 text-xs font-700 text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {rtl ? (
          <>
            <path d="M4 12h14" />
            <path d="M14 6l6 6-6 6" />
          </>
        ) : (
          <>
            <path d="M20 12H6" />
            <path d="M10 6l-6 6 6 6" />
          </>
        )}
      </svg>
      <span>{rtl ? "RTL" : "LTR"}</span>
    </button>
  );
}
