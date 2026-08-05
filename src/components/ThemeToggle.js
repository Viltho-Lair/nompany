"use client";

import { useCallback, useEffect, useState } from "react";

// Hover-expandable theme control: Light / Dark / System. Collapsed it shows only
// the current mode's icon; on hover (or keyboard focus) it expands to reveal the
// other options. The choice is stored in a COOKIE ("theme=light|dark|system",
// 1-year) so it persists and is readable server-side; the no-flash script in the
// root layout reads the same cookie. Default is LIGHT.
const OPTIONS = ["light", "dark", "system"];

function readTheme() {
  try {
    const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "light";
  } catch {
    return "light";
  }
}

function writeTheme(mode) {
  try {
    document.cookie = `theme=${mode}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
}

function applyTheme(mode) {
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && sys);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle({ labels }) {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    setMode(readTheme());
  }, []);

  // Follow the OS when in system mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mode]);

  const choose = useCallback((next) => {
    setMode(next);
    writeTheme(next);
    applyTheme(next);
  }, []);

  const icon = {
    light: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
    dark: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
      </svg>
    ),
    system: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  };

  return (
    <div
      role="group"
      aria-label={labels?.theme || "Theme"}
      className="group inline-flex items-center overflow-hidden rounded-full border border-current/20 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const selected = mode === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => choose(opt)}
            aria-pressed={selected}
            aria-label={labels?.[opt] || opt}
            title={labels?.[opt] || opt}
            className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
              selected
                ? "w-8 bg-current/10 text-current"
                : "w-0 opacity-0 text-current/50 hover:text-current group-hover:w-8 group-hover:opacity-100 focus-visible:w-8 focus-visible:opacity-100"
            }`}
          >
            {icon[opt]}
          </button>
        );
      })}
    </div>
  );
}
