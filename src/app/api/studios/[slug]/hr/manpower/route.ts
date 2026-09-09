import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import { manpowerPlan, savePlanLine, removePlanLine, dayOrToday } from "@/modules/hr/manpowerService";
import type { HrContext } from "@/modules/hr/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HOW MANY PEOPLE THE WORK NEEDS, AGAINST HOW MANY THERE ARE.
//
// NO PERMISSION KEY OF ITS OWN: a plan is a statement about the studio's own
// headcount, which `hr.employees` already opens — and reading it needs the
// roles too, so a right that let somebody plan without seeing who holds what
// would show a gap and hide its cause.
const spec = { auth: "studio", context: hrContext, body: true, name: "hr/manpower" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const url = new URL(c.request.url);
  // TODAY IS READ ON THE SERVER. The plan's dates are UTC days and a browser's
  // idea of today is not, so a horizon defaulting to the viewer's clock would
  // start a day out either side of midnight.
  const day = dayOrToday(url.searchParams.get("day") || "");
  // NINETY DAYS BY DEFAULT — long enough that a shortfall is found before
  // somebody has to hire for it, short enough that the walk is a plan rather
  // than a spreadsheet.
  const to = url.searchParams.get("to")
    || new Date(Date.parse(`${day}T00:00:00Z`) + 90 * 86400000).toISOString().slice(0, 10);

  const result = await manpowerPlan(c as HrContext, { day, to });
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  const result = await savePlanLine(c as HrContext, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await removePlanLine(c as HrContext, id);
  return refused(result) ? result : result;
});
