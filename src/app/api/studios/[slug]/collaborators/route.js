import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister, listCollaborators, updateCollaborator } from "@/lib/studios";
import { cascadeDeleteCollaborator } from "@/lib/data/cascade";
import { getProfile } from "@/lib/data/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The people inside THIS studio. Every row is studio-local: alias, role and
// settings here say nothing about the same person in any other studio.
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });

  const rows = await listCollaborators(context.studio.id);
  // The PICTURE is the one thing here that is not studio-local. A collaborator
  // row carries an alias and a role that mean nothing outside this studio, but
  // the face belongs to the person, so it is read from their own profile and
  // joined on. Only the photo — nothing else from the profile crosses over.
  //
  // Read in parallel; a profile that fails or has no photo simply yields "",
  // which the row already knows how to render as initials.
  const photos = await Promise.all(
    rows.map((c) => (c.userId ? getProfile(c.userId).then((p) => p?.photo || "").catch(() => "") : "")),
  );
  return Response.json({
    collaborators: rows.map((c, i) => ({
      id: c.id, alias: c.alias, role: c.role, isAdmin: c.isAdmin,
      photo: photos[i] || "",
      departmentId: c.departmentId, positionId: c.positionId, createdAt: c.createdAt,
    })),
  });
}

// Edit someone's studio-local identity (alias, role, HR fields). Admin only.
export async function PUT(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  if (!canAdminister(context.studio, context.collaborator)) return Response.json({ error: "forbidden" }, { status: 403 });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  if (!body.collaboratorId) return Response.json({ error: "missing" }, { status: 400 });

  const updated = await updateCollaborator(context.studio.id, body.collaboratorId, body.patch || {});
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  return Response.json({ ok: true, collaborator: { id: updated.id, alias: updated.alias, role: updated.role, isAdmin: updated.isAdmin } });
}

// Remove someone from this studio. Cascades their grants + notifications here
// and drops the studio from their collaboration list — their account and their
// other studios are untouched. The owner cannot be removed.
export async function DELETE(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const targetId = body.collaboratorId || context.collaborator.id; // no id = leave
  const isSelf = targetId === context.collaborator.id;
  if (!isSelf && !canAdminister(context.studio, context.collaborator)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await listCollaborators(context.studio.id);
  const target = rows.find((c) => c.id === targetId);
  if (!target) return Response.json({ error: "notfound" }, { status: 404 });
  if (target.role === "owner") return Response.json({ error: "owner-immutable" }, { status: 409 });

  await cascadeDeleteCollaborator(context.studio.id, targetId);
  return Response.json({ ok: true, removed: targetId, left: isSelf });
}
