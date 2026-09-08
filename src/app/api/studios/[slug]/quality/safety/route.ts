import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { engineContext } from "@/platform/engine/context";
import { listRecords } from "@/platform/engine/records";
import { safetySummary, type WorkedHours } from "@/modules/quality/safety";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import type { EngineContext } from "@/platform/engine/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SAFETY PERFORMANCE — LTIFR, TRIFR, and the incidents behind them.
//
// `daysLost` HAS BEEN ON EVERY INCIDENT SINCE THE REGISTER SHIPPED AND NOTHING
// READ IT. A rate needs a numerator and a denominator; the register held one and
// the timesheets held the other, in different sections, and nothing joined them.
// This is that join.
//
// IT MINTS NO PERMISSION KEY. Both halves are gated already — the incidents by
// `engine.incident.view`, the hours by `projects.list.view` — and a third right
// over records two others already govern would be free to disagree with both.
const spec = { auth: "studio", context: engineContext, body: false, name: "quality/safety" };

const Timesheets = repo<{ entries?: unknown[] }>("timesheets");

export const GET = route(spec, async (c) => {
  const ctx = c as EngineContext & { request: Request };
  const url = new URL(ctx.request.url);
  const period = {
    from: String(url.searchParams.get("from") || ""),
    to: String(url.searchParams.get("to") || ""),
  };

  // ---- the numerator -------------------------------------------------------
  // Through the engine's own service, so `engine.incident.view` is asked the way
  // it is asked everywhere else. A reader without it is refused here rather than
  // handed a rate over rows they may not see.
  const got = await listRecords(ctx, "incident");
  const failed = got as { error?: string };
  if (failed.error) return failed;
  const incidents = (got as { records?: unknown[] }).records || [];

  // ---- the denominator, IF this reader may see it --------------------------
  // TIMESHEETS ARE PROJECTS', not Quality's, and hours are payroll-adjacent: a
  // safety officer holding no Projects right must not learn what the workforce
  // booked. So `null` travels through to the summary meaning "we may not look",
  // which `safetySummary` keeps DISTINCT from "nobody booked any" — a rate over
  // the second would be an infinity and a rate over the first would be a leak.
  //
  // READ DIRECTLY, the way Finance reads a project: the collection is another
  // section's and this needs to COUNT it rather than open its screens. Building
  // a second module context here would re-resolve access that invariant 3 says is
  // resolved once, and would need the raw user this handler is not handed.
  // Resolving the sub-section that owns the collection with a fallback to the
  // parent is the same shape `ownerOf` uses, so a studio predating the
  // sub-section model still answers.
  let worked: WorkedHours[] | null = null;
  if (!requirePermission(ctx.access, "projects.list.view")) {
    const owner = (await getSectionByKey(ctx.studio.id, "projects-list"))
      || (await getSectionByKey(ctx.studio.id, "projects"));
    if (owner) {
      const sheets = await Timesheets.find({ studio: ctx.studio, section: owner });
      // ONE ROW PER ENTRY, not per timesheet. A sheet is a header with a
      // person's days under it; summing the header would lose the DATE each
      // day's hours belong to, which is the whole reason a window can be asked
      // for at all.
      worked = sheets.flatMap((t) => (t.entries || []).map((e) => {
        const entry = e as { date?: unknown; normalHours?: unknown; overtimeHours?: unknown };
        return {
          date: String(entry.date ?? ""),
          // OVERTIME IS HOURS WORKED. Excluding it would shrink the denominator
          // and inflate every rate — in exactly the periods a site was busiest,
          // which is when the rate matters most.
          hours: Number(entry.normalHours || 0) + Number(entry.overtimeHours || 0),
        };
      }));
    }
  }

  return safetySummary(incidents as Parameters<typeof safetySummary>[0], worked, period);
});
