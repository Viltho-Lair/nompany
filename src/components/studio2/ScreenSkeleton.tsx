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
// IT IS THE BRAND MARK NOW, NOT A WIREFRAME — the owner's choice, 24/09/2026.
// This used to be a title/figures/chart/table skeleton, argued for on the
// grounds that it reserved the box the screen would land in. It is the logo's
// six facets lighting in turn, centred on the window. What that gives
// up: the screen no longer lands where a placeholder stood, so it is a swap
// rather than a fill. The box is still held open (`min-h`), so the shell never
// renders around a hole — without something in the content area the nav and
// the header stay, the middle goes white, and it reads as a broken page.
//
// The mark is INLINE, not an <img> of /brand/logo-icon.svg, because each facet
// has to animate on its own and CSS cannot reach inside an image. The paths are
// that file's, verbatim. The animation lives in globals.css (`.brand-loader`),
// not in motion/react, which may not be imported outside the landing.
//
// `rows` is still accepted, and ignored, so no caller has to change.
//
// A `nextDynamic` loading fallback with no `ssr: false` renders on the server
// too; every place this is used sits inside a `StudioLocaleProvider`, so the
// context resolves in the server pass as well. `loadingLabel` still overrides,
// for anywhere that has no provider above it.
"use client";
import { useStudioLocale } from "@/components/studio2/locale";
import { commonDict } from "@/shared/studio/common";

// Facet paths and colours from public/brand/logo-icon.svg, in the order they
// light: clockwise around the hexagon, starting at the top.
const FACETS: readonly (readonly [string, string])[] = [
  ["#48caed", "m1346.31 387.71l-671.47-387.71-673.2 388.67-0.7 775.79z"],
  ["#8ee7ff", "m1345.37 1164.85l0.03-775.36-673.2-388.67-672.2 387.28z"],
  ["#fe9e04", "m1466 2001.07l671.5-387.66v-777.34l-671.5-388.5z"],
  ["#ffbb4d", "m793 1614.32l671.47 387.7 673.2-388.67 0.7-775.78z"],
  ["#ff3333", "m0.75 1304.57l-0.03 775.36 673.2 388.67 672.2-387.28z"],
  ["#ff8686", "m671.5 916.57l-671.5 387.65v777.35l671.5 388.5z"],
];

export default function ScreenSkeleton(
  { loadingLabel }: { rows?: number; loadingLabel?: string },
) {
  // THE HOOK IS NOT INSIDE THE `??`. Written as `loadingLabel ?? commonDict(
  // useStudioLocale()).loading` the right-hand side only evaluates when the
  // prop is absent, so the hook was called on some renders and not others.
  const fallback = commonDict(useStudioLocale()).loading;
  const word = loadingLabel ?? fallback;
  return (
    // The outer box stays IN FLOW to hold the content area open; the mark is
    // `fixed` so it centres on the WINDOW rather than on the content area — the
    // owner's choice, 24/09/2026. `pointer-events-none` so the sidebar and
    // header underneath stay clickable while a screen loads.
    <div className="min-h-[calc(100dvh-10rem)]" aria-busy="true" aria-live="polite">
      <span className="sr-only">{word}</span>
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <svg
          className="brand-loader h-20 w-auto"
          viewBox="0 0 2139 2471"
          aria-hidden="true"
        >
          {FACETS.map(([fill, d], i) => (
            <path key={i} d={d} fill={fill} style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </svg>
      </div>
    </div>
  );
}
