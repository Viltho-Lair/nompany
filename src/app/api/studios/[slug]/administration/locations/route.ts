// LOCATIONS — Administration's Master data, not Field Operations'.
//
// The route lives here because the collection does. It answered under
// `operations/locations` while the rows lived under field-service; a route
// writing a collection it does not own is the kind of thing nobody notices
// until they go looking for who deletes what.
//
// NO BLANKET `canManage` GATE, and that is the change worth reading. The old
// route checked Field Operations' manage flag before calling anything, which
// would now refuse exactly the people this move exists to serve — somebody
// holding administration.master and no rota rights at all. Each verb is left to
// its own service call and its own requirePermission, the same shape the bills
// route uses for approve and pay.
//
// ONE DOOR, TWO SCREENS. Master data and the Operations rota both edit places
// through this route, so there is a single writer and a single set of rules.
// Two screens rendering one service is not the "two doors" problem; two
// services would be.
import { route, refused } from "@/platform/http/route";
import { masterContext, createLocation, editLocation, removeLocation } from "@/modules/administration/master";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: masterContext, body: true, name: "administration/locations" };

export const POST = route(spec, async (master) => {
  const result = await createLocation(master, master.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, location: result.location } };
});

export const PUT = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await editLocation(master, master.body.id, master.body);
  if (refused(result)) return result;
  return { ok: true, location: result.location };
});

// Permits and shifts point at this place — deleting it would leave both
// referring to somewhere that no longer exists. Those two live under Field
// Operations, so the refusal is a cross-section read; it names the counts so
// the screen can say which rota to fix first.
export const DELETE = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await removeLocation(master, master.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
