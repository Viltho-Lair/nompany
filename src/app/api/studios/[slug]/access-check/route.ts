import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { requirePermission, explain, AREAS } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Why can't Sara lock a quotation?" — answered by the system rather than by
// somebody reading Redis.
//
// Gated on people.members.edit: the answer names what a colleague may and may
// not do, which is the same information the access screen already shows to the
// same people, and nobody else's business.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
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
      // `sections` and `grants` used to travel here and explain() has never
      // read either — grants because the tag model is gone, sections because
      // an explanation is about a permission, not about where it applies.
      { collaborator: person, roles: context.roles },
      String(body?.permission || ""),
    ),
    // So the asker can pick a person and an action without knowing key names.
    areas: AREAS,
  });
}
