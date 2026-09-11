// WORK REQUESTS — anybody's report that something is wrong.
//
// PUT CARRIES THE TWO ANSWERS AS NAMED ACTIONS — accept and decline — and
// otherwise edits. Both answers answer to `maintenance.orders.create` inside
// the service, because accepting a request is raising a work order; the route
// adds no gate of its own, so there is one set of rules.
import { route, refused } from "@/platform/http/route";
import {
  maintenanceContext, listRequests, createRequest, editRequest, acceptRequest, declineRequest, removeRequest,
} from "@/modules/maintenance/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: maintenanceContext, body: true, name: "maintenance-requests" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listRequests(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createRequest(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, workRequest: result.request } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const action = String(m.body.action || "");
  if (action === "accept") {
    const accepted = await acceptRequest(m, id, {
      assignedToCollaboratorIds: Array.isArray(m.body.assignedToCollaboratorIds) ? m.body.assignedToCollaboratorIds : [],
      dueOn: String(m.body.dueOn || ""),
      priority: m.body.priority === undefined ? undefined : String(m.body.priority),
    });
    if (refused(accepted)) return accepted;
    return { ok: true, workOrder: accepted.order };
  }
  if (action === "decline") {
    const declined = await declineRequest(m, id, { reason: String(m.body.reason || "") });
    if (refused(declined)) return declined;
    return { ok: true, workRequest: declined.request };
  }
  const result = await editRequest(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, workRequest: result.request };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeRequest(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
