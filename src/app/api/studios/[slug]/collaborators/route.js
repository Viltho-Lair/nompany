import { requirePermission, cleanAssignment, escalates } from "@/platform/access";
import { currentUser } from "@/lib/identity";
import { studioContext, listCollaborators, updateCollaborator } from "@/lib/studios";
import { cascadeDeleteCollaborator } from "@/platform/db/cascade";
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
      // NO isAdmin. It was a second answer to a question roleIds already
      // answers, and the two could disagree — which is the copying this model
      // exists to stop. Admin is the wildcard ROLE; the row reads it from
      // roleIds like every other grant.
      id: c.id, alias: c.alias, role: c.role,
      photo: photos[i] || "",
      // `departmentId` is a SECTION KEY now, and there is no positionId: what
      // somebody is and what they may do are one answer, carried in roleIds.
      departmentId: c.departmentId, createdAt: c.createdAt,
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

  // THE CHANGE BEING ASKED FOR LIVES IN `patch`, and this is the only place
  // that reads it. It used to be read from the top level of the body while the
  // screen sent it nested, so cleanAssignment saw nothing, the escalation check
  // never ran, and `patch` went to the store verbatim — which meant anyone who
  // could edit people could write themselves the Admin role, or `role: "owner"`,
  // and hold every permission in the studio.
  const incoming = body.patch && typeof body.patch === "object" ? body.patch : {};

  // ROLE ASSIGNMENT is cleaned, then checked against what the person doing the
  // assigning actually holds. Editing people is a permission; it is not a
  // licence to write yourself a role you were never given.
  const assignment = cleanAssignment(incoming, (context.roles || []).map((r) => r.id));
  if (Object.keys(assignment).length) {
    const bad = escalates(context.access, assignment, context.roles);
    if (bad) return Response.json(bad, { status: 403 });
  }

  // AN ALLOWLIST, NOT A PASSTHROUGH. updateCollaborator spreads whatever it is
  // handed, so this is the boundary that decides what a request may write.
  // Deliberately absent:
  //   • `role`   — "owner" is ownership, not a setting, and effectivePermissions
  //                short-circuits on it. Nothing outside creation may set it.
  //   • `isAdmin`— gone entirely; Admin is a role id, carried in roleIds.
  //   • HR fields— they belong to HR's own route, behind hr.employees.edit,
  //                which encrypts the identity numbers on the way in.
  const patch = { ...assignment };
  if (incoming.alias !== undefined) patch.alias = String(incoming.alias ?? "").trim().slice(0, 120);
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing" }, { status: 400 });

  const updated = await updateCollaborator(context.studio.id, body.collaboratorId, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  return Response.json({
    ok: true,
    collaborator: {
      id: updated.id, alias: updated.alias, role: updated.role,
      roleIds: Array.isArray(updated.roleIds) ? updated.roleIds : [],
    },
  });
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
