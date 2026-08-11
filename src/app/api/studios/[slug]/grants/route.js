import { currentUser } from "@/lib/identity";
import {
  studioContext, canAdminister, listGrants, listCollaborators, listSections, toggleGrant,
} from "@/lib/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: who can open which sections of THIS studio.
async function guard(paramsPromise) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const context = await studioContext(user, slug);
  if (context.error) {
    return { fail: Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 }) };
  }
  if (!canAdminister(context.studio, context.collaborator)) {
    return { fail: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return context;
}

// Everything the grants grid needs in one read.
export async function GET(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;

  const [grants, collaborators, sections] = await Promise.all([
    listGrants(g.studio.id), listCollaborators(g.studio.id), listSections(g.studio.id),
  ]);
  return Response.json({
    grants: grants.map((x) => ({ id: x.id, subjectId: x.subjectId, sectionId: x.sectionId, action: x.action, effect: x.effect })),
    // Owners/admins are shown but never editable — they always see everything.
    collaborators: collaborators.map((c) => ({
      id: c.id, alias: c.alias, role: c.role, isAdmin: c.isAdmin,
      alwaysFullAccess: c.role === "owner" || c.isAdmin,
    })),
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name })),
  });
}

// Toggle one cell of the grid: { collaboratorId, sectionId, action, enabled }.
export async function POST(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await toggleGrant(g.studio.id, {
    collaboratorId: body.collaboratorId,
    sectionId: body.sectionId,
    action: body.action,
    enabled: Boolean(body.enabled),
  });
  if (result?.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, grants: await listGrants(g.studio.id) });
}
