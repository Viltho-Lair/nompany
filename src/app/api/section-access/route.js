import { requireTag, forbidden } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/auth";
import { getSectionAccess, setSectionAccess, resetSectionAccess } from "@/lib/sectionAccess";
import { ACCESS_TREE, NODE_INDEX } from "@/lib/accessControl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anyone logged in can READ the grant tree (their sidebar needs it to know
// which sections to render); only admin can UPDATE it. `access` is the grant
// object { departments:{code:{node:{action}}}, users:{userId:{node:{action}}} }.
export async function GET() {
  const grants = await getSectionAccess();
  return Response.json({ access: grants, tree: ACCESS_TREE });
}

// Keep only known nodes/actions when saving, so a stale UI can't inject ghost
// permissions.
function sanitize(grants) {
  const clean = (byId) => {
    const out = {};
    for (const [id, nodes] of Object.entries(byId || {})) {
      const cleanNodes = {};
      for (const [node, actions] of Object.entries(nodes || {})) {
        const def = NODE_INDEX[node];
        if (!def) continue;
        const cleanActions = {};
        for (const [act, val] of Object.entries(actions || {})) {
          if (def.actions.includes(act) && (val === "allow" || val === "deny")) cleanActions[act] = val;
        }
        if (Object.keys(cleanActions).length) cleanNodes[node] = cleanActions;
      }
      if (Object.keys(cleanNodes).length) out[id] = cleanNodes;
    }
    return out;
  };
  return { departments: clean(grants?.departments), users: clean(grants?.users) };
}

export async function PUT(request) {
  const actor = await requireTag(ADMIN_TAG);
  if (!actor) return forbidden();
  const body = await request.json();
  const grants = await setSectionAccess(sanitize(body?.access || {}));
  return Response.json({ access: grants });
}

// Clear every grant (admins keep all-access regardless).
export async function DELETE() {
  const actor = await requireTag(ADMIN_TAG);
  if (!actor) return forbidden();
  const grants = await resetSectionAccess();
  return Response.json({ access: grants });
}
