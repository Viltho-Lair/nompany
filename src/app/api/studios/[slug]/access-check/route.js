import { currentUser } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { requirePermission, explain } from "@/lib/access";
import { listCollaborators } from "@/lib/data/collaborators";
import { AREAS } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Why can't Sara lock a quotation?" — answered by the system rather than by
// somebody reading Redis.
//
// Gated on people.members.edit: the answer names what a colleague may and may
// not do, which is the same information the access screen already shows to the
// same people, and nobody else's business.
export async function POST(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const denied = requirePermission(context.access, "people.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const people = await listCollaborators(context.studio.id);
  const person = people.find((c) => c.id === body?.collaboratorId);
  if (!person) return Response.json({ error: "notfound" }, { status: 404 });

  return Response.json({
    ...explain(
      { collaborator: person, roles: context.roles, sections: context.sections, grants: context.grants },
      String(body?.permission || ""),
    ),
    // So the asker can pick a person and an action without knowing key names.
    areas: AREAS,
  });
}
