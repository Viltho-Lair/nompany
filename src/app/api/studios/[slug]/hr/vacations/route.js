import { route } from "@/lib/route";
import { hrContext, requestVacation, decideVacation, removeVacation } from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: hrContext, body: true, name: "hr/vacations" };

// NO canManage ON POST OR PUT, and that is not an oversight.
//
// Requesting leave is not a write in the manage sense — anyone who can open HR
// may ask for their own, and filing it for somebody ELSE is what the service
// checks. Cancelling your own pending request is allowed the same way; deciding
// anyone else's is not. Both distinctions live in hr.js, next to the write they
// guard, which is why neither is repeated here.
//
// DELETE is different: removing the record of a leave request is an HR act.
export const POST = route(spec, async (hr) => {
  // An `overlap` refusal carries the from/to of the leave already in the way.
  const result = await requestVacation(hr, hr.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, vacation: result.vacation } };
});

export const PUT = route(spec, async (hr) => {
  if (!hr.body.id || !hr.body.status) return { error: "missing" };

  // `already-decided` carries the status it already holds, so the screen can say
  // what happened rather than just refusing.
  const result = await decideVacation(hr, hr.body.id, hr.body.status);
  if (result.error) return result;
  return { ok: true, vacation: result.vacation };
});

export const DELETE = route(spec, async (hr) => {
  if (!hr.canManage) return { error: "read-only" };
  if (!hr.body.id) return { error: "missing" };

  const result = await removeVacation(hr, hr.body.id);
  if (result.error) return result;
  return { ok: true };
});
