import { requirePermission, cleanAssignment, escalates } from "@/lib/access";
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
      // WHAT THEY HOLD. Without these the People screen cannot show a role, and
      // the picker would open blank every time — the same silent drop that has
      // bitten every addition to a shared payload this week.
      roleIds: Array.isArray(c.roleIds) ? c.roleIds : [],
      // Exceptions are shown as a COUNT here and as a diff when opened; the
      // list itself is not something to scan in a table.
      overrideCount: ((c.overrides?.allow || []).length + (c.overrides?.deny || []).length),
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
  // Editing who is in the studio, and what they may do, is itself a permission
  // now. canAdminister stays as the owner/admin shortcut inside the resolver,
  // so this reads the same for them and becomes grantable for everyone else.
  if (requirePermission(context.access, "people.members.edit")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  if (!body.collaboratorId) return Response.json({ error: "missing" }, { status: 400 });

  // ROLE ASSIGNMENT is cleaned, then checked against what the person doing the
  // assigning actually holds. Editing people is a permission; it is not a
  // licence to write yourself a role you were never given.
  const assignment = cleanAssignment(body, (context.roles || []).map((r) => r.id));
  if (Object.keys(assignment).length) {
    const bad = escalates(context.access, assignment, context.roles);
    if (bad) return Response.json(bad, { status: 403 });
    Object.assign(body, assignment);
  }

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
  // Removing yourself is always allowed; removing anyone else is the same
  // permission as editing them.
  if (!isSelf && requirePermission(context.access, "people.members.edit")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await listCollaborators(context.studio.id);
  const target = rows.find((c) => c.id === targetId);
  if (!target) return Response.json({ error: "notfound" }, { status: 404 });
  if (target.role === "owner") return Response.json({ error: "owner-immutable" }, { status: 409 });

  await cascadeDeleteCollaborator(context.studio.id, targetId);
  return Response.json({ ok: true, removed: targetId, left: isSelf });
}
