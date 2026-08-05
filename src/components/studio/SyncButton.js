"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { triggerSync } from "@/lib/useLivePoll";

// Header Auto-Sync: a cloud button that refreshes everything the user can see
// (each live-polling list/badge/notification re-fetches on the shared sync
// event — all already scoped to the user's access, filters and columns). Auto-
// syncs every 20s while the tab is visible, unless pressed sooner.
//
// This is a BACKGROUND refresh — it deliberately does NOT call router.refresh(),
// so it never reloads/remounts the page. Any open form, modal or print view
// survives a sync; only the live data behind them updates.
export default function SyncButton() {
  const [spinning, setSpinning] = useState(false);

  const doSync = useCallback(() => {
    setSpinning(true);
    triggerSync();
    setTimeout(() => setSpinning(false), 900);
  }, []);

  // Auto-sync every 20 seconds (paused while the tab is hidden).
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) doSync(); }, 20000);
    return () => clearInterval(id);
  }, [doSync]);

  return (
    <button
      onClick={doSync}
      title="Sync now — auto-syncs every 20s"
      aria-label="Sync data"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-500 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
    >
      <Icon name="cloud" className={`h-[18px] w-[18px] ${spinning ? "animate-pulse text-brand-600" : ""}`} />
    </button>
  );
}
