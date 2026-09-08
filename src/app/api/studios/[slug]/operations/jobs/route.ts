import { route, refused } from "@/platform/http/route";
import { scheduleContext } from "@/modules/operations/operations";
import { listJobs, createJob, updateJob, setJobStatus } from "@/modules/operations/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Schedule owns jobs — it is the section a work package is dispatched from.
// A job is also the one execution record that can HEAD a deal (Template D), so
// this route opens deals as well as attaching to them.
const spec = { auth: "studio", context: scheduleContext, body: true, name: "field-service-jobs" };

export const GET = route({ ...spec, body: false }, async (schedule) => {
  const result = await listJobs(schedule);
  if (refused(result)) return result;
  return { ok: true, jobs: result.jobs };
});

export const POST = route(spec, async (schedule) => {
  const result = await createJob(schedule, schedule.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, job: result.job } };
});

export const PUT = route(spec, async (schedule) => {
  if (!schedule.body.id) return { error: "missing" };
  const result = await updateJob(schedule, String(schedule.body.id), schedule.body);
  if (refused(result)) return result;
  return { ok: true, job: result.job };
});

// Status is a transition, not a field — the same distinction change orders and
// timesheets draw. A job reaching done is what Template D bills on
// (billingTrigger: signoff), so it is not something an edit should be able to
// set in passing.
//
// THE STATUS IS NARROWED HERE, and this line was a live defect: it passed the
// whole BODY where `setJobStatus` takes a status string, so `isStatus(next)`
// was asked of an object, answered false, and EVERY transition returned
// `{ error: "status" }`. No job in this product could leave `scheduled` — not
// to in-progress, not to completed, so `completedAt` was never stamped and
// Template D's signoff billing trigger could never fire.
//
// IT IS THE CHANGE ORDER'S BUG A SECOND TIME. There, the route passed its whole
// body where `answerChangeOrder` expects a boolean, and an object being truthy
// meant a REJECTION approved the variation. Same shape, opposite symptom: one
// failed loudly for everybody and the other failed silently for one caller.
// Neither was reachable by the compiler — a route handler's `body` is not
// statically typed — so `tests/restructure.mjs` now refuses the shape by name.
export const PATCH = route(spec, async (schedule) => {
  const id = String(schedule.body.id || "");
  if (!id) return { error: "missing" };
  const result = await setJobStatus(schedule, id, String(schedule.body.status ?? ""));
  if (refused(result)) return result;
  return { ok: true, job: result.job };
});
