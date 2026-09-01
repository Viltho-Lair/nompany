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
export const PATCH = route(spec, async (schedule) => {
  const id = String(schedule.body.id || "");
  if (!id) return { error: "missing" };
  const result = await setJobStatus(schedule, id, schedule.body);
  if (refused(result)) return result;
  return { ok: true, job: result.job };
});
