import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import { lifecycleView, moveEmployment, recordEvent } from "@/modules/hr/lifecycleService";
import type { HrContext } from "@/modules/hr/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE EMPLOYMENT SPINE. One read for the screen; a POST moves somebody's
// employment one step, a PUT records what happened to them without moving it.
//
// TWO VERBS FOR TWO KINDS OF WRITE, rather than one endpoint taking a `kind`.
// A move changes `employmentStatus` and answers to `edit` — or, where it ends
// the employment, to `offboard`; a transfer or a note never changes it and
// always answers to `edit`. Routing both through one door would mean the
// permission a request needs depended on a field inside it, which is the shape
// that let a rejected change order approve itself.
const spec = { auth: "studio", context: hrContext, body: true, name: "hr/lifecycle" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const result = await lifecycleView(c as HrContext);
  return refused(result) ? result : { ok: true, ...result };
});

export const POST = route(spec, async (c) => {
  // An `illegal-move` refusal carries the state it was refused FROM, so the
  // screen says "they are already on notice" rather than "that did not work".
  // The refusal and the success are both returned as they stand: a move
  // answers with the state it reached, and the route has nothing to add.
  return moveEmployment(c as HrContext, c.body);
});

export const PUT = route(spec, async (c) => {
  const result = await recordEvent(c as HrContext, c.body);
  return refused(result) ? result : { ok: true, ...result };
});
