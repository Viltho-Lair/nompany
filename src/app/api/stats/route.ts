import { NextResponse } from "next/server";
import { readPlatformStats, showsFigure, statedFigure, THRESHOLDS } from "@/platform/db/platformStats";

/* THE PUBLIC STATISTICS FEED.
   ------------------------------------------------------------------
   IT SERVES WHAT THE PAGES SERVE AND NOTHING MORE. Every figure is passed
   through `statedFigure` before it leaves — rounded down, never exact — and a
   figure below its threshold is not merely hidden, it is ABSENT. Returning the
   real number with a `show: false` beside it would put the exact count in a
   public response and leave one caller away from printing it.

   AN EXACT COUNT IS A TRACKER. Two requests a week apart tell a reader how fast
   the business is growing, and a competitor polling monthly learns more from it
   than any customer does. Rounding down also means the number is one the
   product can always stand behind: never larger than the truth, only older.

   NOTHING PER-TENANT IS REACHABLE HERE, by construction rather than by
   filtering — the stored document holds three integers and a timestamp, and no
   studio name, id or per-tenant count was ever written into it.

   THE PAGES DO NOT USE THIS. Home and platform read the document directly as
   server components; making them fetch their own process would put the figures
   in a round trip instead of in the HTML. This exists for callers that are not
   this process. */

export const runtime = "nodejs";

export async function GET() {
  const stats = await readPlatformStats();

  const body: Record<string, unknown> = {
    // The thresholds are published deliberately: a reader who wants to know
    // what "absent" means can see it, and a figure that is absent is then
    // information rather than a gap.
    thresholds: THRESHOLDS,
    refreshedAt: stats?.refreshedAt || null,
  };
  for (const field of Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]) {
    if (showsFigure(stats, field)) body[field] = statedFigure(stats![field]);
  }

  return NextResponse.json(body, {
    // Rebuilt once a night, so a minute of edge caching costs nothing and
    // spares the store a read per curious caller.
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
}
