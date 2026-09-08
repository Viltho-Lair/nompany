import { route, refused } from "@/platform/http/route";
import { scheduleContext } from "@/modules/operations/operations";
import { listJobs } from "@/modules/operations/jobs";
import { listCollaborators } from "@/platform/auth/collaborators";
import { dispatchBoard, strandedJobs } from "@/modules/operations/dispatch";
import type { ScheduleContext } from "@/modules/operations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE DISPATCH BOARD. Read-only: assigning somebody to a job is editing the
// job, so it answers to `PUT /operations/jobs` like every other change to one.
// Growing a second write path out of a board would be two ways to staff a job,
// free to disagree about what staffing one means.
//
// NO PERMISSION KEY OF ITS OWN — `listJobs` asks `fieldService.schedule.view`,
// which is the right that opens the jobs this arranges.
const spec = { auth: "studio", context: scheduleContext, body: false, name: "field-service-dispatch" };

export const GET = route(spec, async (c) => {
  const ctx = c as ScheduleContext;
  const result = await listJobs(ctx);
  if (refused(result)) return result;

  // THE DAY COMES FROM THE CALLER, and today is the fallback read HERE rather
  // than in the browser: a board whose default day was the viewer's clock would
  // disagree with the records across a timezone, and the records are UTC.
  const asked = new URL(c.request.url).searchParams.get("day") || "";
  const today = new Date().toISOString().slice(0, 10);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;

  const people = await listCollaborators(ctx.studio.id);
  const crew = people.map((p) => ({ id: String(p.id), alias: String(p.alias || "") }));

  return {
    ok: true,
    today,
    ...dispatchBoard(result.jobs, crew, day),
    // SEPARATE FROM THE DAY'S BOARD, because a dispatcher's worst case is not
    // today's gap — it is the job scheduled for last Tuesday that nobody was
    // put on, which is invisible on every day view including this one.
    stranded: strandedJobs(result.jobs, today),
  };
});
