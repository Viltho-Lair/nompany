"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { registerDialogHandler } from "@/lib/appDialog";

// Renders the current in-app dialog (see lib/appDialog). Blocks interaction
// until the user answers — no click-outside dismissal.
export default function AppDialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    return registerDialogHandler((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })));
  }, []);

  const close = useCallback((result) => {
    setDialog((d) => { d?.resolve(result); return null; });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => { if (e.key === "Escape") close(dialog.mode === "confirm" ? false : undefined); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  if (!dialog) return null;
  const danger = dialog.tone === "danger";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-[#20202c]">
        <span className={`mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${danger ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400" : "bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"}`}>
          <Icon name={danger ? "close" : "checkDouble"} className="h-6 w-6" />
        </span>
        {dialog.title && <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">{dialog.title}</h2>}
        <p className="text-sm text-slate-600 dark:text-slate-300">{dialog.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          {dialog.mode === "confirm" && (
            <button
              onClick={() => close(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Icon name="close" className="h-4 w-4" /> {dialog.cancelLabel || "Cancel"}
            </button>
          )}
          <button
            onClick={() => close(dialog.mode === "confirm" ? true : undefined)}
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-600 text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-700 hover:bg-brand-950"}`}
          >
            <Icon name="checkDouble" className="h-4 w-4" /> {dialog.confirmLabel || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
