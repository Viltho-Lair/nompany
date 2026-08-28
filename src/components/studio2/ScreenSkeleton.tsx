// WHAT A DEPARTMENT SCREEN LOOKS LIKE BEFORE ITS CHUNK ARRIVES.
//
// The studio's screens are `nextDynamic()` now, one chunk each, so between
// clicking Finance and seeing Finance there is a fetch. Without something in
// the content area the shell renders around a hole — the nav and the header
// stay, the middle goes white, and the effect reads as a broken page rather
// than a loading one.
//
// IT RESERVES THE BOX RATHER THAN FILLING IT. Title, a row of figures, a chart
// and a table: the shape almost every department screen actually has, so the
// real thing lands roughly where the placeholder stood instead of shoving the
// page open. That is the whole job of a skeleton, and it is why this is not a
// spinner — a spinner tells you to wait; this tells you what you are waiting
// for.
//
// `.skel` is the shared utility in globals.css, not a per-screen animation.
//
// A `nextDynamic` loading fallback with no `ssr: false` renders on the server
// too, which is why this was a Server Component and its one word stayed
// English. It is a CLIENT component now: every place it is used sits inside a
// `StudioLocaleProvider`, so the context resolves in the server pass as well.
// `loadingLabel` still overrides, for anywhere that has no provider above it.
"use client";
import { useStudioLocale } from "@/components/studio2/locale";
import { commonDict } from "@/shared/studio/common";

export default function ScreenSkeleton(
  { rows = 6, loadingLabel }: { rows?: number; loadingLabel?: string },
) {
  const word = loadingLabel ?? commonDict(useStudioLocale()).loading;
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{word}</span>

      <div className="skel skel-text h-6 w-48" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-geex border border-slate-200/70 p-5 dark:border-white/10"
          >
            <span className="skel skel-text block h-3 w-24" />
            <span className="skel mt-3 block h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>

      <div className="rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
        <span className="skel skel-text block h-3 w-32" />
        <div
          className="mt-4 grid items-end gap-[3%]"
          style={{ height: 200, gridTemplateColumns: "repeat(12, minmax(0,1fr))" }}
        >
          {/* A fixed sequence, never Math.random(): a random skeleton renders
              one way on the server and another in the browser, and React calls
              that a hydration mismatch. */}
          {[42, 58, 35, 71, 49, 84, 62, 38, 76, 55, 67, 44].map((h, i) => (
            <span key={i} className="skel block w-full rounded-t-md" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      <div className="rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-white/5">
            <span className="skel skel-circle block h-8 w-8 shrink-0" />
            <span className="skel skel-text block h-3 flex-1" />
            <span className="skel skel-text block h-3 w-20 shrink-0" />
            <span className="skel skel-text block h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
