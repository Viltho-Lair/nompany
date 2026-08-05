"use client";

import { useState } from "react";

// A titled panel that can be expanded/collapsed. Used above the team list so
// visitors can shrink the intro to focus on the members.
export default function Collapsible({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-start"
      >
        <h2 className="font-display text-lg font-700 text-brand-950 dark:text-white">{title}</h2>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-steel-400/30 text-brand-700 dark:border-white/15 dark:text-brand-300">
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
