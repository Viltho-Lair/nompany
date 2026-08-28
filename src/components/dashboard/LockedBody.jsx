"use client";

import { useStudioLocale } from "@/components/studio2/locale";
import { chromeDict } from "@/shared/studio/chrome";

// THE PAID-RUNG TEASER. Analytics is sold, so a widget above the studio's rung
// does not vanish — it shows a blurred shape and NAMES what it would show, so
// the value is visible and the upgrade is obvious (the "locked card" §2.4 asks
// for). A faux chart drawn with the shared `.skel` tone, no real data behind it.
//
// IT LIVES IN ITS OWN FILE BECAUSE IT IS THE ONLY PART THAT NEEDS A CLIENT.
// `dashboard/index` is deliberately hook-free so a dashboard of these can render
// on the server and stream; this teaser has to know the reader's language, which
// only a client tree knows. Splitting it puts the client boundary exactly where
// the requirement is instead of dragging Widget, DashGrid and StatRow across it.
function LockIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

export default function LockedBody({ what }) {
  const t = chromeDict(useStudioLocale());
  return (
    <div className="relative min-h-[8rem]">
      <div className="pointer-events-none flex h-32 select-none items-end gap-[4%] px-1 opacity-50 blur-[1.5px]" aria-hidden="true">
        {[52, 74, 39, 63, 85, 47, 70, 58].map((h, i) => (
          <span key={i} className="skel block w-full rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
          <LockIcon />
        </span>
        <p className="text-xs font-600 text-slate-600 dark:text-slate-300">{what || t.deeperAnalytics}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{t.higherPlan}</p>
      </div>
    </div>
  );
}
