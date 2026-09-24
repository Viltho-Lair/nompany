import { panel } from "@/components/studio2/ui";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";

// THE SHAPES ScreenSkeleton IS NOT — and, for a whole page, no longer any shape.
//
// A FULL-PAGE WAIT IS THE BRAND MARK NOW — the owner, 24/09/2026. A record
// profile and a document of lines used to reserve their own shapes here (a
// header, a two-column details split, a table of lines), because drawing a
// dashboard where a document was coming made the arrival a jump. Every
// full-page wait shows the logo at the centre of the window instead, so
// `RecordSkeleton` and `LinesSkeleton` are ScreenSkeleton under their old
// names: their callers keep their imports and nothing else has to know.
//
// WHAT STAYS SHAPED is a wait INSIDE something already on screen: the Live
// boards' table under a header they drew themselves, and the project board's
// 380px information sidebar. A window-centred logo for one panel would float
// over a page that has otherwise arrived.
//
// THE LABEL IS A PROP, NOT A HOOK. These are only ever rendered by a screen
// that already holds its own dictionary, so the word comes down as
// `loadingLabel`; when it is absent ScreenSkeleton falls back to the locale.
//
// `.skel` is the shared utility in globals.css, not a per-screen animation.

function CardSkeleton({ children, className = "" }) {
  return <section className={`${panel} min-h-0 ${className}`}>{children}</section>;
}

// A card heading — `h2` is text-lg font-800.
function HeadingSkeleton({ w = "w-32" }) {
  return (
    <h2 className="font-display text-lg font-800" aria-hidden="true">
      <span className={`skel skel-text inline-block h-[0.62em] ${w} align-middle`} />
    </h2>
  );
}

// A label-over-value pair, which is what DetailField draws.
function FieldSkeleton({ w }) {
  return (
    <div>
      <span className="skel skel-text block h-2 w-16" />
      <span className={`skel skel-text mt-2 block h-3 ${w}`} />
    </div>
  );
}

/** A RECORD PROFILE — the ticket screen, and the project's cost, billing,
 * BOQ, permit and purchase-order screens. Full-page, so the brand mark. */
export function RecordSkeleton({ loadingLabel }) {
  return <ScreenSkeleton loadingLabel={loadingLabel} />;
}

/**
 * A TABLE, ON ITS OWN — for a screen that already drew its own header.
 *
 * The two Live views are full-screen boards: each renders its own `<header>`
 * with the board's name and its column controls, and then a table underneath.
 * They want the table reserved and nothing above it: it fills a box on the
 * page it sits on rather than a page of its own.
 *
 * The columns are fixed widths rather than equal parts because the real tables
 * are a wide description against three narrow figures, and four equal columns
 * settle into something visibly different.
 */
export function TableSkeleton({ loadingLabel, rows = 8 }) {
  return (
    <CardSkeleton className="overflow-hidden p-0" aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      <div className="flex items-center gap-4 border-b border-slate-200/70 px-6 py-3 dark:border-white/10">
        <span className="skel skel-text block h-2 flex-1" />
        <span className="skel skel-text block h-2 w-16 shrink-0" />
        <span className="skel skel-text block h-2 w-20 shrink-0" />
        <span className="skel skel-text block h-2 w-24 shrink-0" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-3.5"
          style={{ borderBottom: i === rows - 1 ? "none" : "1px solid rgb(148 163 184 / 0.15)" }}
        >
          <span className="skel skel-text block h-2.5 flex-1" />
          <span className="skel skel-text block h-2.5 w-16 shrink-0" />
          <span className="skel skel-text block h-2.5 w-20 shrink-0" />
          <span className="skel skel-text block h-2.5 w-24 shrink-0" />
        </div>
      ))}
    </CardSkeleton>
  );
}

/** A DOCUMENT OF LINES — the quotation viewer and the project sheet.
 * Full-page, so the brand mark. */
export function LinesSkeleton({ loadingLabel }) {
  return <ScreenSkeleton loadingLabel={loadingLabel} />;
}

/**
 * THE PROJECT BOARD'S INFORMATION SIDEBAR, and nothing else.
 *
 * The board's own wait is not the page's: the kanban columns render on their
 * own, and this is the `w-[380px]` aside beside them, which fetches the
 * project's facts separately. Its three sections — the client, the project, and
 * what was sold — are what this reserves. A page-shaped skeleton here would
 * have been drawn inside a 380px column.
 */
export function InfoPanelSkeleton({ loadingLabel }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      {[3, 5, 2].map((fields, card) => (
        <CardSkeleton key={card}>
          <HeadingSkeleton w="w-24" />
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {Array.from({ length: fields }, (_, i) => (
              <FieldSkeleton key={i} w={i % 2 ? "w-20" : "w-28"} />
            ))}
          </div>
        </CardSkeleton>
      ))}
    </div>
  );
}
