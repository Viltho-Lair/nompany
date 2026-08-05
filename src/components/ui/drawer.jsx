"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Lightweight slide-in Drawer (shadcn "Sheet" style, no external deps). The
// panel stays mounted and is translated off-screen when closed, so content
// inside (e.g. a ResizeObserver-measured timeline) keeps its width. Closes on
// overlay click, the close button, or Escape; locks body scroll while open.
export function Drawer({ open, onClose, title, description, side = "right", widthClass = "w-[min(94vw,1120px)]", actions, className, children }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const hidden = side === "right" ? "translate-x-full rtl:-translate-x-full" : "-translate-x-full rtl:translate-x-full";

  return (
    <div aria-hidden={!open} className={cn("fixed inset-0 z-[80]", !open && "pointer-events-none")}>
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute top-0 flex h-full flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-[#20202c]",
          side === "right" ? "end-0 border-s" : "start-0 border-e",
          "border-slate-200 dark:border-white/10",
          widthClass,
          open ? "translate-x-0" : hidden,
          className
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            {title && <h2 className="truncate font-display text-base font-700 text-slate-900 dark:text-white">{title}</h2>}
            {description && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export default Drawer;
