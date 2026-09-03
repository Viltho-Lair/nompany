// WHAT A DEPARTMENT SCREEN LOOKS LIKE BEFORE IT HAS ANYTHING TO SHOW.
//
// OPENING A SECTION WAITS THREE TIMES, and this is what stands there for all
// three. They happen in this order and the reader should not be able to tell
// where one ends and the next begins:
//
//   1. THE SERVER ROUND TRIP — app/studio/loading.js, the route's loading
//      boundary, while the page resolves.
//   2. THE CHUNK — the `nextDynamic` loading fallback in the studio page.
//      Every screen is code-split, so between clicking Finance and having
//      Finance there is a fetch.
//   3. THE SCREEN'S OWN DATA — each screen is a client component that fetches
//      from its own API after it mounts, and until that lands it has nothing
//      to draw.
//
// The third one used to be a bare line of text — `<p>Loading Sales…</p>` — in
// every department screen, so a section click went skeleton, skeleton, then a
// sentence in the top-left corner of an empty box, and only then the screen.
// The text was the only one of the three that told you nothing about what was
// coming, and it was the longest of the three waits. It is this component now,
// with the sentence kept as the `loadingLabel` so screen readers still hear it.
//
// Without something in the content area the shell renders around a hole — the
// nav and the header stay, the middle goes white, and the effect reads as a
// broken page rather than a loading one.
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
  // THE HOOK IS NOT INSIDE THE `??`. Written as `loadingLabel ?? commonDict(
  // useStudioLocale()).loading` the right-hand side only evaluates when the
  // prop is absent, so the hook was called on some renders and not others.
  const fallback = commonDict(useStudioLocale()).loading;
  const word = loadingLabel ?? fallback;
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* THE ANNOUNCEMENT RIDES INSIDE THE TITLE BAR, NOT ABOVE IT.
          As a sibling it was the FIRST child, which made the title bar the
          second — and `space-y-6` puts its 1.5rem on every child except the
          first. The span is `sr-only` so nothing was visible to explain it, and
          the margin collapsed straight out through <main>, which has `pb-8` and
          no padding-top to stop it. Measured in the sandbox: <main> sat at
          y=112 while the skeleton stood and at y=88 once the screen arrived, so
          every screen in the studio jumped 24px upward on load — this component
          is the loading fallback for about twenty of them.
          Inside the bar it announces identically (sr-only is 1px and absolute,
          so it adds no height) and it is no longer a sibling, which makes the
          title bar the first child again and leaves it with no margin. */}
      <div className="skel skel-text h-6 w-48"><span className="sr-only">{word}</span></div>

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
