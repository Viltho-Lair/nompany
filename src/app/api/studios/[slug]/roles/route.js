import { currentUser } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { requirePermission, escalates, AREAS } from "@/platform/access";
import { listRoles, createRole, updateRole, deleteRole, cleanRole, ADMIN_ROLE_ID } from "@/lib/data/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The roles of one studio, and the catalogue they are built from.
//
// Reading is open to anyone who may open the studio: knowing that a role called
// "Sales Engineer" exists is not sensitive, and the People screen shows those
// names on rows. WRITING is people.members.edit, the same permission as
// changing who holds what — defining a role and handing it out are two halves
// of the same act.

async function open(ctx) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    const status = context.error === "notfound" ? 404 : 403;
    return { fail: Response.json({ error: context.error }, { status }) };
  }
  return { context };
}

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function GET(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  return Response.json({
    roles: await listRoles(g.context.studio.id),
    // The catalogue travels with them so the editor can render every area and
    // its verbs without a second call, and can never offer a key the server
    // would refuse.
    areas: AREAS,
    canEdit: !requirePermission(g.context.access, "people.members.edit"),
  });
}

// Refuse a role that contains anything its author cannot do themselves. Writing
// it into a role and then assigning it would otherwise be a way around the
// escalation check on assignment — the same escape, one step further back.
function overreaches(context, draft) {
  return escalates(context.access, { overrides: { allow: draft.permissions } }, []);
}

export async function POST(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  const denied = requirePermission(g.context.access, "people.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const draft = cleanRole(await body(request));
  const bad = overreaches(g.context, draft);
  if (bad) return Response.json(bad, { status: 403 });
  return Response.json({ role: await createRole(g.context.studio.id, draft) }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  const denied = requirePermission(g.context.access, "people.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const payload = await body(request);
  if (!payload?.id) return Response.json({ error: "missing" }, { status: 400 });
  // Admin is a wildcard whose list is meaningless, so it has nothing to
  // overreach with; roles.js already restricts it to its description.
  if (payload.id !== ADMIN_ROLE_ID) {
    const bad = overreaches(g.context, cleanRole(payload));
    if (bad) return Response.json(bad, { status: 403 });
  }
  await updateRole(g.context.studio.id, payload.id, payload);
  return Response.json({ ok: true, roles: await listRoles(g.context.studio.id) });
}

export async function DELETE(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  const denied = requirePermission(g.context.access, "people.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const { id } = await body(request);
  const out = await deleteRole(g.context.studio.id, id);
  // Admin cannot be deleted: a studio with no wildcard role is one where a new
  // capability reaches nobody at all, including whoever is supposed to fix it.
  if (out.error) return Response.json(out, { status: 400 });
  return Response.json({ ok: true, roles: await listRoles(g.context.studio.id) });
}
