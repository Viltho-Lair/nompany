import { route, refused } from "@/platform/http/route";
import { projectsContext } from "@/modules/projects/projects";
import {
  listTimesheets, createTimesheet, updateTimesheet,
  submitTimesheet, answerTimesheet,
} from "@/modules/projects/timesheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: projectsContext, body: true, name: "projects-timesheets" };

// THE LIST IS ROWS, NOT TOTALS. timesheetTotals and summariseByEmployee are
// pure functions over rows and are deliberately not called here: a per-employee
// summary is a read-time view, never a store, and returning one from the list
// endpoint would make it the obvious thing to cache and then the obvious thing
// to disagree with the rows it came from.
export const GET = route({ ...spec, body: false }, async (projects) => {
  const result = await listTimesheets(projects);
  if (refused(result)) return result;
  return { ok: true, timesheets: result.timesheets };
});

export const POST = route(spec, async (projects) => {
  const result = await createTimesheet(projects, projects.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, timesheet: result.timesheet } };
});

export const PUT = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const result = await updateTimesheet(projects, String(projects.body.id), projects.body);
  if (refused(result)) return result;
  return { ok: true, timesheet: result.timesheet };
});

// Same reasoning as change orders: approving a timesheet is a transition, and
// invariant 7 is enforced there rather than by the permission model. A generic
// PUT taking a status would let somebody approve their own hours.
export const PATCH = route(spec, async (projects) => {
  const id = String(projects.body.id || "");
  if (!id) return { error: "missing" };

  const action = String(projects.body.action || "");
  const result = action === "submit"
    ? await submitTimesheet(projects, id)
    : action === "approve" || action === "reject"
      ? await answerTimesheet(projects, id, projects.body)
      : { error: "action" };

  if (refused(result)) return result;
  return { ok: true, timesheet: result.timesheet };
});
