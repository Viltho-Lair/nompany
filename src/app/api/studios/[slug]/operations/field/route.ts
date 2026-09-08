import { route, refused } from "@/platform/http/route";
import { scheduleContext } from "@/modules/operations/operations";
import { fieldView, signJob } from "@/modules/operations/fieldService";
import type { ScheduleContext } from "@/modules/operations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE MOBILE FIELD VIEW — one technician's round, and the customer's signature.
//
// NO PERMISSION KEY OF ITS OWN: reading asks `fieldService.schedule.view` and
// signing asks `.edit`, the right that already changes a job.
//
// THE CALLER NEVER NAMES THEMSELVES. `ctx.collaborator` is the identity inside
// a studio (invariant 6) and it is what `assignedToCollaboratorIds` holds, so
// "my round" needs no parameter — which is also what stops one technician
// asking for another's.
const spec = { auth: "studio", context: scheduleContext, body: true, name: "field-service-field" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await fieldView(c as ScheduleContext);
  return refused(result) ? result : { ok: true, ...result };
});

// A SIGNATURE IS APPENDED, NOT SET, so this is a POST rather than a PUT on the
// job: the mark stands once taken, a revisit is signed again, and neither is an
// edit to the one before it.
export const POST = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await signJob(c as ScheduleContext, id, c.body);
  return refused(result) ? result : { ok: true, ...result };
});
