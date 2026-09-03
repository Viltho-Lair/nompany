import { panel } from "@/components/studio2/ui";

// THE SHAPES ScreenSkeleton IS NOT.
//
// ScreenSkeleton reserves a department dashboard — a title, a row of figures, a
// chart, a table — and that is right for the ten section screens that use it.
// It is a lie on the four screens here. A ticket profile has no chart; a
// quotation is a document of priced lines; the project board's wait happens
// inside a 380px information sidebar, not on the page at all. Drawing a chart
// placeholder where a document is coming makes the arrival a jump, which is the
// one thing a skeleton exists to prevent, so those four kept a bare line of text
// when the section screens stopped using one.
//
// Three shapes rather than four: the quotation viewer and the sheet viewer are
// both "a header, then lines", so they share one.
//
// THE LABEL IS A PROP, NOT A HOOK. ScreenSkeleton reads the locale from context
// because it is also used as a `nextDynamic` fallback, where there is nothing to
// pass it. These are only ever rendered by a screen that already holds its own
// dictionary, so the word comes down as `loadingLabel` and none of them needs to
// be a client component in its own right.
//
// `.skel` is the shared utility in globals.css, not a per-screen animation.

// The back button, title and reference line every record screen opens with.
// Matches Back / the viewers' header: a pill-shaped ghost button beside an
// `text-xl font-800` heading over an `text-xs` line.
function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <span className="skel block h-[38px] w-20 rounded-full" />
      <div className="min-w-0 flex-1">
        {/* The real h1/p, carrying bars instead of words, so the line boxes come
            from the same type scale rather than from numbers restated here —
            the same trick the studio's loading boundary needed when it had a
            header of its own to reserve. */}
        <h1 className="truncate font-display text-xl font-800" aria-hidden="true">
          <span className="skel skel-text inline-block h-[0.62em] w-52 align-middle" />
        </h1>
        <p className="truncate text-xs" aria-hidden="true">
          <span className="skel skel-text inline-block h-[0.72em] w-36 align-middle" />
        </p>
      </div>
    </div>
  );
}

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

/**
 * A RECORD PROFILE — the ticket screen.
 *
 * Header, then the real `lg:grid-cols-[1fr_320px]` split: a details card whose
 * `dl` is two columns of label/value pairs, a list card under it, and the
 * narrow column beside them. Reserving the 320px column matters more than what
 * is in it — without it the left column renders full width and then jumps in
 * when the sidebar arrives.
 */
export function RecordSkeleton({ loadingLabel, fields = 10, rows = 3 }) {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-24", "w-36", "w-20", "w-28", "w-24", "w-32"];
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      <HeaderSkeleton />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <CardSkeleton>
            <HeadingSkeleton />
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {Array.from({ length: fields }, (_, i) => (
                <FieldSkeleton key={i} w={widths[i % widths.length]} />
              ))}
            </dl>
          </CardSkeleton>

          <CardSkeleton>
            <HeadingSkeleton w="w-24" />
            <ul className="mt-3 space-y-2">
              {Array.from({ length: rows }, (_, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-200/70 px-4 py-3 dark:border-white/10">
                  <span className="skel skel-text block h-2.5 w-20 shrink-0" />
                  <span className="skel skel-text block h-2.5 flex-1" />
                  <span className="skel skel-text block h-2.5 w-16 shrink-0" />
                </li>
              ))}
            </ul>
          </CardSkeleton>
        </div>

        <div className="space-y-4">
          <CardSkeleton>
            <HeadingSkeleton w="w-20" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }, (_, i) => <FieldSkeleton key={i} w="w-28" />)}
            </div>
          </CardSkeleton>
          <CardSkeleton>
            <HeadingSkeleton w="w-24" />
            <span className="skel skel-text mt-4 block h-2.5 w-full" />
            <span className="skel skel-text mt-2 block h-2.5 w-2/3" />
          </CardSkeleton>
        </div>
      </div>
    </div>
  );
}

/**
 * A TABLE, ON ITS OWN — for a screen that already drew its own header.
 *
 * The two Live views are full-screen boards: each renders its own `<header>`
 * with the board's name and its column controls, and then a table underneath.
 * They want the table reserved and nothing above it, so this is the half of
 * LinesSkeleton below the back row rather than a second copy of it.
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

/**
 * A DOCUMENT OF LINES — the quotation viewer and the project sheet.
 *
 * The back row and title, then the table. Both of these screens open with a
 * header of their own, unlike the Live views above.
 */
export function LinesSkeleton({ loadingLabel, rows = 8 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      <HeaderSkeleton />
      <TableSkeleton rows={rows} />
    </div>
  );
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
